import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';
import {
  collectMountedTurnMessages,
  findChatGPTScrollRoot,
  getConversationTurns,
} from './chatgpt_scroll_collector.js';

export class ChatGPTParser extends ChatParser {
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
