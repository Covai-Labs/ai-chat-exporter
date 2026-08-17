import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

async function getOrganizationId() {
  try {
    const response = await fetch('https://claude.ai/api/organizations', {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) return null;
    const orgs = await response.json();
    if (Array.isArray(orgs) && orgs.length > 0) {
      const chatOrg = orgs.find((org) => org.capabilities && org.capabilities.includes('chat'));
      return chatOrg ? chatOrg.uuid : orgs[0].uuid;
    }
  } catch (e) {
    console.error('[AI Exporter] Failed to detect org ID:', e);
  }
  return null;
}

function getConversationId() {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    return window.location.pathname.match(/\/chat\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchConversation(orgId, conversationId) {
  const url = `https://claude.ai/api/organizations/${orgId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch Claude conversation: ${response.status}`);
  }
  return response.json();
}

function getCurrentBranch(data) {
  if (!data.chat_messages || !data.current_leaf_message_uuid) {
    return [];
  }
  const messageMap = new Map();
  data.chat_messages.forEach((msg) => {
    if (msg && msg.uuid) {
      messageMap.set(msg.uuid, msg);
    }
  });

  const branch = [];
  let currentUuid = data.current_leaf_message_uuid;
  while (currentUuid && messageMap.has(currentUuid)) {
    const message = messageMap.get(currentUuid);
    branch.unshift(message);
    currentUuid = message.parent_message_uuid;
    if (!messageMap.has(currentUuid)) {
      break;
    }
  }
  return branch;
}

function extractArtifactsFromText(text) {
  const artifactRegex = /<antArtifact[^>]*>([\s\S]*?)<\/antArtifact>/g;
  const artifacts = [];
  let match;
  while ((match = artifactRegex.exec(text)) !== null) {
    const fullTag = match[0];
    const content = match[1];

    const titleMatch = fullTag.match(/title="([^"]*)"/);
    const languageMatch = fullTag.match(/language="([^"]*)"/);

    artifacts.push({
      title: titleMatch ? titleMatch[1] : 'Artifact',
      language: languageMatch ? languageMatch[1] : 'text',
      content: content.trim(),
    });
  }
  return artifacts;
}

function extractArtifacts(message) {
  const artifacts = [];
  if (message.content && Array.isArray(message.content)) {
    for (const content of message.content) {
      if (
        content.type === 'tool_use' &&
        (content.name === 'artifacts' || content.name === 'create_file') &&
        content.display_content
      ) {
        const displayContent = content.display_content;
        if (displayContent.type === 'code_block' && displayContent.code) {
          const filename = displayContent.filename || 'artifact';
          const title = filename
            .split('/')
            .pop()
            .replace(/\.[^.]+$/, '');
          artifacts.push({
            title: title || 'Artifact',
            language: displayContent.language || 'text',
            content: displayContent.code.trim(),
          });
        } else if (displayContent.type === 'json_block' && displayContent.json_block) {
          try {
            const data = JSON.parse(displayContent.json_block);
            if (data.filename) {
              const filename = data.filename;
              const title = filename
                .split('/')
                .pop()
                .replace(/\.[^.]+$/, '');
              artifacts.push({
                title: title || 'Artifact',
                language: data.language || 'text',
                content: (data.code || '').trim(),
              });
            }
          } catch (e) {
            console.warn('[AI Exporter] Failed to parse tool use artifact json:', e);
          }
        }
      }
      if (content.text) {
        artifacts.push(...extractArtifactsFromText(content.text));
      }
    }
  }
  if (message.text) {
    artifacts.push(...extractArtifactsFromText(message.text));
  }
  return artifacts;
}

export class ClaudeParser extends ChatParser {
  name = 'Claude';
  constructor() {
    super();
    this.lastFetch = null;
  }

  isAvailable(url) {
    return url.includes('claude.ai');
  }

  async parse(options = {}) {
    const title = document.title || 'Claude Chat';
    const messages = [];

    const conversationId = getConversationId();
    const parserMode = options.parserMode || 'auto';

    if (conversationId && parserMode !== 'prefer_dom') {
      const orgId = await getOrganizationId();
      if (orgId) {
        try {
          const now = Date.now();
          let data;

          if (
            this.lastFetch &&
            this.lastFetch.conversationId === conversationId &&
            now - this.lastFetch.timestamp < 20000
          ) {
            data = this.lastFetch.data;
          } else {
            data = await fetchConversation(orgId, conversationId);
            this.lastFetch = {
              conversationId,
              timestamp: now,
              data,
            };
          }

          const branch = getCurrentBranch(data);

          const convTitle = data.name || title;

          for (const message of branch) {
            const role = message.sender === 'human' ? 'User' : 'Claude';

            let contentStr = '';

            // Construct content
            if (message.content && Array.isArray(message.content)) {
              for (const block of message.content) {
                if (block.type === 'thinking' && block.thinking) {
                  contentStr += `> **Thinking Process:**\n> \n> ${block.thinking.replace(/\n/g, '\n> ')}\n\n`;
                } else if (block.type === 'text' && block.text) {
                  const cleanText = block.text
                    .replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '')
                    .trim();
                  if (cleanText) {
                    contentStr += `${cleanText}\n\n`;
                  }
                }
              }
            } else if (message.text) {
              const cleanText = message.text
                .replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '')
                .trim();
              if (cleanText) {
                contentStr += `${cleanText}\n\n`;
              }
            }

            // Append attachments (for user messages)
            if (message.attachments && message.attachments.length > 0) {
              for (const attachment of message.attachments) {
                if (attachment.file_name) {
                  let header = `### Attachment: ${attachment.file_name}`;
                  const meta = [];
                  if (attachment.file_size) {
                    meta.push(`${(attachment.file_size / 1024).toFixed(1)} KB`);
                  }
                  if (attachment.file_type) {
                    meta.push(attachment.file_type);
                  }
                  if (meta.length > 0) {
                    header += ` _(${meta.join(', ')})_`;
                  }
                  contentStr += `\n\n${header}\n`;
                  if (attachment.extracted_content) {
                    contentStr += `\`\`\`\`\n${attachment.extracted_content}\n\`\`\`\`\n\n`;
                  }
                } else if (attachment.extracted_content) {
                  contentStr += `\n\n### Pasted\n\`\`\`\`\n${attachment.extracted_content}\n\`\`\`\`\n\n`;
                }
              }
            }

            contentStr = contentStr.trim();
            if (contentStr) {
              messages.push({ role, content: contentStr });
            }

            // Extract and push artifacts
            const artifacts = extractArtifacts(message);
            for (const artifact of artifacts) {
              let artContent = '';
              const artTitle = artifact.title || 'Artifact';
              const artText = artifact.content || '';
              const artLang = artifact.language || 'text';

              if (artLang === 'markdown' || artLang === 'text') {
                const quotedContent = artText
                  .split('\n')
                  .map((line) => `> ${line}`)
                  .join('\n');
                artContent = `\n\n> **Artifact: ${artTitle}**\n\n${quotedContent}\n\n`;
              } else {
                artContent = `\n\n> **Artifact: ${artTitle}**\n\`\`\`${artLang}\n${artText}\n\`\`\`\n\n`;
              }

              messages.push({
                role: 'Claude Artifact',
                content: artContent.trim(),
              });
            }
          }

          const currentUrl =
            typeof window !== 'undefined' && window.location ? window.location.href || '' : '';
          const metadata = {
            Source: 'Claude',
            Date: new Date().toLocaleString(),
            Link: currentUrl,
            Model: data.model || 'Claude',
          };

          return { title: convTitle, messages, url: currentUrl, metadata };
        } catch (e) {
          console.error('[AI Exporter] Claude API parse failed, falling back to DOM:', e);
        }
      }
    }

    // Inject the React reader script if not already injected (DOM Fallback)
    if (!document.getElementById('ai-export-claude-reader')) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/claude_react_reader.js');
      script.id = 'ai-export-claude-reader';
      script.onload = function () {
        this.remove(); // Clean up script tag
      };
      (document.head || document.documentElement).appendChild(script);
      // Give it a moment to initialize
      await new Promise((r) => setTimeout(r, 100));
    }

    // Helper to get artifact info
    const getArtifactInfo = (index) => {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'RspAtftInfo' && event.data.idx === index) {
            window.removeEventListener('message', handler);
            resolve(event.data.atftInfo);
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'ReqAtftInfo', idx: index }, window.location.origin);

        // Timeout fallback
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 1000); // 1s timeout
      });
    };

    const strictSelectors = [
      '[data-testid="user-message"]',
      '.font-claude-message',
      '.font-claude-response',
      '.artifact-block-cell',
    ].join(', ');

    const fallbackSelectors = ['div.font-serif'].join(', ');

    const strictCandidates = Array.from(document.querySelectorAll(strictSelectors));
    const fallbackCandidates = Array.from(document.querySelectorAll(fallbackSelectors));

    const validFallbacks = fallbackCandidates.filter((fallback) => {
      const overlapsWithError = strictCandidates.some(
        (strict) => strict.contains(fallback) || fallback.contains(strict),
      );
      return !overlapsWithError;
    });

    const combined = [...new Set([...strictCandidates, ...validFallbacks])];

    const allElements = combined.sort((a, b) => {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    const artifactElements = document.querySelectorAll('.artifact-block-cell');
    const artifactMap = new Map();
    artifactElements.forEach((el, index) => artifactMap.set(el, index));

    for (const el of allElements) {
      let role = 'Unknown';
      let content = '';

      if (el.matches('[data-testid="user-message"]')) {
        role = 'User';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button').forEach((btn) => btn.remove());
        content = convertToMarkdown(clone);
      } else if (
        el.matches('.font-claude-message') ||
        el.matches('.font-claude-response') ||
        el.matches('div.font-serif')
      ) {
        role = 'Claude';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button').forEach((btn) => btn.remove());
        content = convertToMarkdown(clone);
      } else if (el.matches('.artifact-block-cell')) {
        role = 'Claude Artifact';

        const index = artifactMap.get(el);
        if (index !== undefined) {
          const info = await getArtifactInfo(index);
          if (info) {
            const artTitle = info.title || 'Artifact';
            const artContent = info.content || '';
            const artLang = info.language || 'text';
            if (artLang === 'markdown' || artLang === 'text') {
              const quotedContent = artContent
                .split('\n')
                .map((line) => `> ${line}`)
                .join('\n');
              content = `\n\n> **Artifact: ${artTitle}**\n\n${quotedContent}\n\n`;
            } else {
              content = `\n\n> **Artifact: ${artTitle}**\n\`\`\`${artLang}\n${artContent}\n\`\`\`\n\n`;
            }
          } else {
            const header =
              el.querySelector('.flex.items-center.gap-2') || el.querySelector('.font-bold');
            const fallbackTitle = header ? header.innerText.split('\n')[0] : 'Unknown Artifact';
            content = `\n> [Artifact: ${fallbackTitle} - content extraction failed]\n`;
          }
        }
      }

      if (content) {
        messages.push({ role, content });
      }
    }

    const currentUrl =
      typeof window !== 'undefined' && window.location ? window.location.href || '' : '';
    const metadata = {
      Source: 'Claude',
      Date: new Date().toLocaleString(),
      Link: currentUrl,
      Model: 'Claude',
    };

    return { title, messages, url: currentUrl, metadata };
  }
}
