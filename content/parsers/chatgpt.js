import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';
import {
  collectMountedTurnMessages,
  findChatGPTScrollRoot,
  getConversationTurns,
} from './chatgpt_scroll_collector.js';

function getAccessToken() {
  try {
    const el = typeof document !== 'undefined' && document.getElementById('client-bootstrap');
    if (!el) return null;
    return JSON.parse(el.textContent).session.accessToken;
  } catch {
    return null;
  }
}

function getConversationId() {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const path = window.location.pathname || window.location.href || '';
    return path.match(/\/c\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function fetchConversation(convId, token, includeImages) {
  return new Promise((resolve, reject) => {
    const requestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const handler = (event) => {
      if (event.data?.source !== 'chatgpt-exporter-page') return;
      if (event.data?.requestId !== requestId) return;
      window.removeEventListener('message', handler);
      clearTimeout(timer);
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve({ data: event.data.data, images: event.data.images ?? {} });
      }
    };

    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timed out'));
    }, 45000);

    window.addEventListener('message', handler);
    window.postMessage(
      {
        source: 'chatgpt-exporter-ext',
        type: 'fetch_conversation',
        convId,
        token,
        requestId,
        includeImages,
      },
      'https://chatgpt.com',
    );
  });
}

function linearize(mapping, includeImages) {
  const root = Object.values(mapping).find((n) => !n.parent || !mapping[n.parent]);

  const subtreeSize = {};
  function size(id) {
    if (id in subtreeSize) return subtreeSize[id];
    const node = mapping[id];
    if (!node) return (subtreeSize[id] = 0);
    const childSizes = (node.children ?? []).map((cid) => size(cid));
    return (subtreeSize[id] = 1 + (childSizes.length ? Math.max(...childSizes) : 0));
  }
  for (const id of Object.keys(mapping)) size(id);

  const messages = [];
  let node = root;

  while (node) {
    const msg = node.message;
    const role = msg?.author?.role;
    if (role === 'user' || role === 'assistant' || role === 'tool') {
      const segments = [];
      const parts = msg.content?.parts ?? [];
      for (const part of parts) {
        let partText = '';
        if (typeof part === 'string') {
          partText = part;
        } else if (part && typeof part === 'object') {
          if (part.content_type === 'text' && typeof part.text === 'string') {
            partText = part.text;
          }
        }

        if (partText && role !== 'tool') {
          const text = partText
            .replace(/\u{E0000}[\u{E0000}-\u{E007F}]*/gu, '')
            .replace(/citeturn\d+\w*/g, '')
            .trim();
          if (text) segments.push({ type: 'text', content: text });
        } else if (
          includeImages &&
          part?.content_type === 'image_asset_pointer' &&
          part?.asset_pointer
        ) {
          segments.push({ type: 'image', fileId: part.asset_pointer.split('://')[1] });
        }
      }
      const displayRole = role === 'user' ? 'User' : 'ChatGPT';
      if (segments.length) {
        const citeMap = {};
        const imageGroupMap = {};
        for (const ref of msg.metadata?.content_references ?? []) {
          if (ref.matched_text) {
            if (ref.items?.length) citeMap[ref.matched_text] = ref.items;
            if (ref.type === 'image_group' || ref.matched_text.includes('image_group')) {
              imageGroupMap[ref.matched_text] = ref;
            }
          }
        }
        messages.push({ role: displayRole, segments, citeMap, imageGroupMap });
      }
    }
    const validChildren = (node.children ?? []).filter((cid) => cid in mapping);
    node = validChildren.length
      ? mapping[
          validChildren.reduce((best, cid) => (subtreeSize[cid] > subtreeSize[best] ? cid : best))
        ]
      : null;
  }

  return messages;
}

function cleanMarkdownFromApi(text, citeMap, imageGroupMap) {
  if (!text) return '';

  // 1. Remove specific character ranges (like some PUA ranges)
  text = text
    .replace(/\u{E0000}[\u{E0000}-\u{E007F}]*/gu, '')
    .replace(/citeturn\d+\w*/g, '')
    .trim();

  // 2. Replace ChatGPT PUA URL annotations: url{label}{href}
  text = text.replace(
    /\uE200url\uE202([^\uE202\uE201]+)\uE202([^\uE201]+)\uE201/g,
    (_, label, href) => `[${label.trim()}](${href.trim()})`,
  );

  // 3. Replace ChatGPT PUA entity annotations: entity[\"type\",\"name\",...]
  text = text.replace(/\uE200entity\uE202([^\uE201]+)\uE201/g, (_, json) => {
    try {
      const arr = JSON.parse(json.replace(/\\"/g, '"'));
      const name = Array.isArray(arr) && arr[1] ? arr[1] : json;
      return name;
    } catch {
      return json;
    }
  });

  // 3.5. Clean/replace ChatGPT PUA image_group annotations: image_group{json}
  text = text.replace(/\uE200image_group\uE202[^\uE201]+\uE201/g, (match) => {
    const ref = imageGroupMap?.[match];
    if (ref) {
      if (Array.isArray(ref.images) && ref.images.length > 0) {
        const markdownImgs = ref.images
          .map((imgObj) => {
            const res = imgObj.image_result || {};
            const title = res.title || imgObj.image_search_query || 'Image';
            const src = res.content_url || res.thumbnail_url || res.original_content_url;
            if (src) {
              return `![${title}](${src})`;
            }
            return '';
          })
          .filter(Boolean);
        if (markdownImgs.length > 0) {
          return '\n\n' + markdownImgs.join('\n\n') + '\n\n';
        }
      }
      if (ref.safe_urls && Array.isArray(ref.safe_urls) && ref.safe_urls.length > 0) {
        return (
          '\n\n' + ref.safe_urls.map((url, i) => `![Image ${i + 1}](${url})`).join('\n\n') + '\n\n'
        );
      }
      if (ref.alt) {
        return '\n\n' + ref.alt + '\n\n';
      }
    }
    return '';
  });

  // 4. Replace ChatGPT PUA cite annotations
  text = text.replace(/\uE200cite(?:\uE202[^\uE202\uE201]+)+\uE201/g, (match) => {
    const items = citeMap?.[match] ?? [];
    if (!items.length) return '';
    const formatted = items.map((item) => {
      const label = item.attribution || item.title || 'Source';
      return `[${label}](${item.url})`;
    });
    return ` (${formatted.join(', ')})`;
  });

  return text;
}

export class ChatGPTParser extends ChatParser {
  constructor() {
    super();
    this.lastFetch = null;
  }

  isAvailable(url) {
    return url.includes('chatgpt.com');
  }

  getRoleElement(container) {
    if (container.matches?.('[data-message-author-role]')) return container;
    return container.querySelector?.('[data-message-author-role]') || null;
  }

  getRoleElements(container) {
    if (container.matches?.('[data-message-author-role]')) return [container];
    return Array.from(container.querySelectorAll?.('[data-message-author-role]') || []);
  }

  getMessageRole(container, roleElement) {
    const roleAttr = roleElement?.getAttribute('data-message-author-role');
    if (roleAttr) return roleAttr === 'user' ? 'User' : 'ChatGPT';

    const text = container.innerText || '';
    if (text.startsWith('You\n') || text.includes('\nYou\n')) return 'User';

    return 'ChatGPT';
  }

  getContentElement(container, roleElement) {
    if (roleElement?.getAttribute('data-message-author-role') === 'user') {
      return roleElement;
    }

    const selectors = ['.markdown', '.prose', '.whitespace-pre-wrap'];
    for (const selector of selectors) {
      const contentElement = container.querySelector?.(selector);
      if (contentElement) return contentElement;
    }

    return roleElement || (container.matches?.('article') ? container : null);
  }

  getContentElements(container, roleElements) {
    const contentElements = [];

    roleElements.forEach((roleElement) => {
      const contentElement = this.getContentElement(roleElement, roleElement);
      if (contentElement) contentElements.push(contentElement);
    });

    if (contentElements.length > 0) return contentElements;

    const fallback = this.getContentElement(container, roleElements[0]);
    return fallback ? [fallback] : [];
  }

  cleanContent(content) {
    return content
      .replace(/^Show moreShow less$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  getMessageKey(container, roleElement, role, content) {
    const idElement =
      roleElement?.closest?.('[data-message-id]') || container.querySelector?.('[data-message-id]');
    const messageId = idElement?.getAttribute('data-message-id');
    if (messageId) return messageId;

    const turnId = container.getAttribute?.('data-testid');
    if (turnId) return `${turnId}:${role}`;

    return `${role}:${content.replace(/\s+/g, ' ').trim()}`;
  }

  extractAttachments(container) {
    const attachments = [];
    const rawContent = container.textContent || container.innerText || '';
    const filePatterns = [
      /([a-zA-Z0-9_-]+\.tex)/g,
      /([a-zA-Z0-9_-]+\.txt)/g,
      /([a-zA-Z0-9_-]+\.md)/g,
      /([a-zA-Z0-9_-]+\.pdf)/g,
      /([a-zA-Z0-9_-]+\.doc)/g,
    ];
    const foundFiles = new Set();

    filePatterns.forEach((pattern) => {
      const matches = rawContent.match(pattern);
      if (matches) matches.forEach((match) => foundFiles.add(match));
    });

    foundFiles.forEach((fileName) => {
      const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
      const typeMap = {
        tex: 'LaTeX',
        txt: 'Text',
        md: 'Markdown',
        pdf: 'PDF',
        doc: 'Document',
        docx: 'Document',
      };
      attachments.push({ name: fileName, type: typeMap[fileExt] || 'File' });
    });

    return attachments;
  }

  extractImages(container) {
    const seenSrcs = new Set();
    const capturedImages = [];

    container.querySelectorAll?.('img').forEach((img) => {
      const src = img.getAttribute('src');
      const alt = img.getAttribute('alt') || 'Image';
      const isContentImage =
        src?.includes('backend-api') ||
        src?.includes('files') ||
        src?.startsWith('blob:') ||
        alt.includes('Uploaded') ||
        alt.includes('Generated');

      if (src && !seenSrcs.has(src) && isContentImage) {
        seenSrcs.add(src);
        capturedImages.push(`![${alt}](${src})`);
      }
    });

    return capturedImages;
  }

  appendAttachments(content, attachments, capturedImages) {
    const attachmentLines = [];
    const groupedAttachments = {};

    attachments.forEach((attachment) => {
      groupedAttachments[attachment.type] ||= [];
      groupedAttachments[attachment.type].push(attachment.name);
    });

    Object.entries(groupedAttachments).forEach(([type, files]) => {
      attachmentLines.push(`**${type} Files:**`);
      files.forEach((file) => attachmentLines.push(`- ${file}`));
      attachmentLines.push('');
    });

    if (capturedImages.length > 0) {
      if (attachmentLines.length > 0) attachmentLines.push('');
      attachmentLines.push('**Images:**');
      capturedImages.forEach((image) => attachmentLines.push(`- ${image}`));
    }

    if (attachmentLines.length === 0) return content;
    return `${content}\n\n**Attachments & Images:**\n${attachmentLines.join('\n')}`;
  }

  convertContentElement(contentElement) {
    return convertToMarkdown(contentElement);
  }

  extractMessage(container) {
    const roleElements = this.getRoleElements(container);
    const roleElement = roleElements[0] || this.getRoleElement(container);
    const contentElements = this.getContentElements(container, roleElements);
    if (contentElements.length === 0) return null;

    const role = this.getMessageRole(container, roleElement);
    const noiseSelectors = ['.flex.gap-2', 'button', '.sr-only', '[role="button"]'];
    const contentParts = contentElements
      .map((contentElement) => {
        const clone = contentElement.cloneNode(true);
        clone.querySelectorAll('button').forEach((button) => {
          const img = button.querySelector('img');
          if (!img) return;

          let caption = 'Image';
          const ariaLabel = button.getAttribute('aria-label') || '';
          if (ariaLabel.toLowerCase().includes('open image details for')) {
            caption = ariaLabel.replace(/^Open image details for\s*/i, '').trim();
          } else if (img.getAttribute('alt') && !img.getAttribute('alt').startsWith('http')) {
            caption = img.getAttribute('alt').trim();
          }

          const alt = img.getAttribute('alt') || '';
          const src = img.getAttribute('src') || '';
          const imageUrl = alt.startsWith('http://') || alt.startsWith('https://') ? alt : src;

          if (imageUrl) {
            const newImg = clone.ownerDocument.createElement('img');
            newImg.setAttribute('src', imageUrl);
            newImg.setAttribute('alt', caption);
            button.parentNode.replaceChild(newImg, button);
          }
        });

        noiseSelectors.forEach((selector) => {
          clone.querySelectorAll(selector).forEach((node) => node.remove());
        });
        return this.cleanContent(this.convertContentElement(clone));
      })
      .filter(Boolean);

    let content = contentParts.join('\n\n');
    content = this.appendAttachments(
      content,
      this.extractAttachments(container),
      this.extractImages(container),
    );

    if (!content) return null;

    return {
      role,
      content,
      key: this.getMessageKey(container, roleElement, role, content),
    };
  }

  extractMountedMessages() {
    const articles = Array.from(document.querySelectorAll('article'));
    const containers =
      articles.length > 0
        ? articles
        : Array.from(document.querySelectorAll('[data-message-author-role]'));

    return containers
      .map((container) => this.extractMessage(container))
      .filter(Boolean)
      .map(({ role, content }) => ({ role, content }));
  }

  async extractAllConversationTurns() {
    const turns = getConversationTurns(document);
    if (turns.length === 0) return [];

    return collectMountedTurnMessages({
      turns,
      scrollRoot: findChatGPTScrollRoot(turns, document),
      extractMessage: (turn) => this.extractMessage(turn),
    });
  }

  async parse(options = {}) {
    const title = document.title || 'ChatGPT Session';
    const messages = [];

    const token = getAccessToken();
    const convId = getConversationId();
    const parserMode = options.parserMode || 'auto';

    if (token && convId && parserMode !== 'prefer_dom') {
      try {
        const includeImages = options.includeImages !== false;
        const now = Date.now();
        let result;

        if (
          this.lastFetch &&
          this.lastFetch.convId === convId &&
          this.lastFetch.includeImages === includeImages &&
          now - this.lastFetch.timestamp < 20000
        ) {
          result = this.lastFetch.result;
        } else {
          if (!document.getElementById('ai-export-chatgpt-helper')) {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('content/chatgpt_helper.js');
            script.id = 'ai-export-chatgpt-helper';
            script.onload = function () {
              this.remove();
            };
            (document.head || document.documentElement).appendChild(script);
            await new Promise((r) => setTimeout(r, 100));
          }

          result = await fetchConversation(convId, token, includeImages);
          this.lastFetch = {
            convId,
            includeImages,
            timestamp: now,
            result,
          };
        }

        const apiMessages = linearize(result.data.mapping, includeImages);

        const convTitle = result.data.title || title;

        for (const msg of apiMessages) {
          let content = '';
          for (const seg of msg.segments) {
            if (seg.type === 'text') {
              content += cleanMarkdownFromApi(seg.content, msg.citeMap, msg.imageGroupMap) + '\n\n';
            } else if (seg.type === 'image') {
              const src = result.images[seg.fileId];
              if (src) {
                content += `![Image](${src})\n\n`;
              }
            }
          }
          content = content.trim();
          if (content) {
            messages.push({
              role: msg.role,
              content: content,
            });
          }
        }

        const metadata = {
          Source: 'ChatGPT',
          Date: new Date().toLocaleString(),
          Link: window.location.href,
          Model:
            result.data.model_slug ||
            document.querySelector('[data-testid="model-selector-dropdown"]')?.innerText ||
            'ChatGPT',
        };

        return { title: convTitle, messages, metadata };
      } catch (e) {
        console.error('[AI Exporter] API parse failed, falling back to DOM:', e);
      }
    }

    // Check if we have iframe-based content (deep research feature)
    const iframes = document.querySelectorAll('iframe[src*="oaiusercontent.com"]');
    if (iframes.length > 0) {
      console.log('Detected iframe-based content, attempting extraction...');

      // Try multiple strategies to extract content
      let extractedContent = '';

      // Strategy 1: Look for data in script tags or window objects
      try {
        // Check if any conversation data is exposed globally
        if (window.conversationData || window.chatData) {
          extractedContent = JSON.stringify(window.conversationData || window.chatData);
        }
      } catch (e) {
        console.log('Global data access failed:', e);
      }

      // Strategy 2: Look for preloaded content in hidden elements
      if (!extractedContent) {
        const hiddenSelectors = [
          '[data-conversation]',
          '[data-messages]',
          '.conversation-data',
          '.chat-transcript',
          'pre[data-conversation]',
        ];

        for (const selector of hiddenSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            extractedContent = element.textContent;
            break;
          }
        }
      }

      // Strategy 3: Enhanced text extraction from main content
      if (!extractedContent) {
        const mainContent =
          document.querySelector('main') ||
          document.querySelector('[role="main"]') ||
          document.querySelector('.conversation') ||
          document.body;

        if (mainContent) {
          const textContent = mainContent.textContent || mainContent.innerText;
          if (textContent && textContent.trim()) {
            const lines = textContent.split('\n').filter((line) => line.trim());

            // Look for conversation patterns
            const conversationLines = lines.filter(
              (line) =>
                line.length > 20 && // Substantial content
                !line.includes('ChatGPT') &&
                !line.includes('Regenerate') &&
                !line.includes('Copy code') &&
                !line.includes('Continue') &&
                !line.includes('Share') &&
                !line.includes('Thumb') &&
                !line.includes('New chat') &&
                !line.includes('Menu') &&
                !line.includes('Settings') &&
                !line.includes('History'),
            );

            if (conversationLines.length > 0) {
              extractedContent = conversationLines.join('\n\n');
            }
          }
        }
      }

      // Strategy 4: Last resort - check for any meaningful content
      if (!extractedContent) {
        const allText = document.body.textContent || document.body.innerText;
        if (allText && allText.trim().length > 100) {
          extractedContent = allText.trim();
        }
      }

      // If we found content, try to structure it
      if (extractedContent) {
        // Try to identify user vs assistant messages
        const lines = extractedContent.split('\n').filter((line) => line.trim());

        lines.forEach((line) => {
          if (line.length > 10) {
            // Simple heuristic: shorter lines are often user prompts
            if (
              line.length < 200 ||
              line.includes('?') ||
              line.includes('write') ||
              line.includes('tell')
            ) {
              messages.push({
                role: 'User',
                content: line.trim(),
              });
            } else {
              messages.push({
                role: 'ChatGPT',
                content: line.trim(),
              });
            }
          }
        });
      }

      // Add note about extraction method
      if (messages.length > 0) {
        messages.push({
          role: 'ChatGPT',
          content:
            '*Note: Content extracted from iframe-based ChatGPT interface. Some formatting may be lost.*',
        });
      } else {
        // Last resort - add a message explaining the limitation
        messages.push({
          role: 'ChatGPT',
          content:
            '*Note: ChatGPT is using iframe-based content that cannot be accessed by browser extensions. Please try exporting from a standard ChatGPT conversation.*',
        });
      }

      return { title, messages };
    }

    const fullExport = options.full !== false;
    const extractedMessages = fullExport
      ? await this.extractAllConversationTurns()
      : this.extractMountedMessages();
    messages.push(
      ...(extractedMessages.length > 0 ? extractedMessages : this.extractMountedMessages()),
    );

    const metadata = {
      Source: 'ChatGPT',
      Date: new Date().toLocaleString(),
      Link: window.location.href,
      Model:
        document.querySelector('[data-testid="model-selector-dropdown"]')?.innerText || 'ChatGPT',
    };

    return { title, messages, metadata };
  }
}
