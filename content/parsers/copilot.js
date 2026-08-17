import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class CopilotParser extends ChatParser {
  name = 'Copilot';
  isAvailable(url) {
    return (
      url.includes('copilot.microsoft.com') ||
      url.includes('copilot.com') ||
      url.includes('copilot.cloud.microsoft') ||
      url.includes('m365.cloud.microsoft') ||
      url.includes('m365.microsoft.com') ||
      url.includes('bing.com/chat') ||
      url.includes('bing.com/copilot') ||
      url.includes('bing.com/copilotsearch') ||
      url.includes('edgeservices.bing.com')
    );
  }

  async parse() {
    let title = 'Copilot Conversation';
    if (document.title) {
      const cleanTitle = document.title
        .replace(/^Microsoft Copilot:\s*/i, '')
        .replace(/\s*-\s*Microsoft Copilot$/i, '')
        .replace(/^Copilot:\s*/i, '')
        .replace(/\s*-\s*Copilot$/i, '')
        .replace(/Your AI companion/i, '')
        .trim();
      if (
        cleanTitle &&
        cleanTitle.toLowerCase() !== 'microsoft copilot' &&
        cleanTitle.toLowerCase() !== 'copilot'
      ) {
        title = cleanTitle;
      }
    }

    const messages = [];

    // Helper to process code blocks and links before HTML-to-markdown conversion
    const processAiElement = (element) => {
      const clone = element.cloneNode(true);

      // Remove UI noise elements
      const noiseSelectors = [
        '[data-testid="message-item-reactions"]',
        '[data-testid="user-message-reactions"]',
        '[data-testid="copy-ai-message-button"]',
        '[data-testid="copy-user-message-button"]',
        '[data-testid="CopyButtonContainerTestId"]',
        '[data-testid="CopyButtonTestId"]',
        '[data-testid="FeedbackContainerTestId"]',
        '[data-testid="feedback-button-testid"]',
        '[data-testid="overflow-menu-button"]',
        '[data-testid="share-message-button"]',
        '[data-testid="message-thumbs-up-button"]',
        '[data-testid="message-thumbs-down-button"]',
        '[data-testid="message-read-aloud-button"]',
        '[data-testid="regenerate-message-button-popover"]',
        '[data-testid="chat-suggestion"]',
        '[data-testid="loading-message"]',
        '.fai-CopilotMessage__actions',
        '.fai-SuggestionList',
        '.fai-UserMessage__accessibleHeading',
        '.fai-CopilotMessage__accessibleHeading',
        '[class*="suggestedReplies"]',
        '[class*="workingCard"]',
        '[class*="WorkingCard"]',
        '[class*="disclaimerText"]',
        'cib-action-bar',
        'cib-feedback-buttons',
        'cib-message-actions',
        '.sr-only',
      ];
      noiseSelectors.forEach((sel) => {
        clone.querySelectorAll(sel).forEach((el) => el.remove());
      });

      // Transform data-url span buttons into standard anchor tags
      clone.querySelectorAll('span[data-url]').forEach((span) => {
        const url = span.getAttribute('data-url');
        if (url && !url.startsWith('ca://')) {
          const a = document.createElement('a');
          a.href = url;
          a.textContent = span.textContent;
          span.replaceWith(a);
        }
      });

      // Standardize code blocks with language labels
      clone.querySelectorAll('div.rounded-xl, div[class*="code-block"]').forEach((block) => {
        const langEl = block.querySelector('span.capitalize, [class*="language-"]');
        const codeEl = block.querySelector('code, pre');
        if (codeEl) {
          const lang = langEl ? langEl.innerText.trim().toLowerCase() : '';
          const codeText = codeEl.innerText || codeEl.textContent;
          const newPre = document.createElement('pre');
          const newCode = document.createElement('code');
          if (lang) {
            newCode.className = `language-${lang}`;
          }
          newCode.textContent = codeText;
          newPre.appendChild(newCode);
          block.replaceWith(newPre);
        }
      });

      return clone.innerHTML;
    };

    // Multi-tier DOM extraction strategy

    // Tier 1: Modern M365 Copilot / Bebop layout & data-content markers
    let turnElements = Array.from(
      document.querySelectorAll(
        '[data-testid="chatQuestion"], [data-testid="copilot-message-div"], [data-content="user-message"], [data-content="ai-message"], [data-content="assistant-message"], [data-message-author-role="user"], [data-message-author-role="assistant"], [data-testid="chat-turn-user"], [data-testid="chat-turn-bot"], [data-testid="chat-turn-assistant"], [data-testid="user-turn"], [data-testid="copilot-turn"], .fai-UserMessage, .fai-CopilotMessage',
      ),
    );

    // Filter out nested matches
    if (turnElements.length) {
      turnElements = turnElements.filter(
        (el) => !turnElements.some((other) => other !== el && other.contains(el)),
      );
    }

    // Tier 2: Tailwind group classes if direct markers are absent
    if (!turnElements.length) {
      turnElements = Array.from(
        document.querySelectorAll(
          '[class*="group/user-message"], [class*="group/ai-message"], [class*="group/assistant-message"]',
        ),
      );
    }

    // Tier 3: testid attributes
    if (!turnElements.length) {
      turnElements = Array.from(
        document.querySelectorAll(
          '[data-testid="user-message"], [data-testid="ai-message"], [data-testid="assistant-message"]',
        ),
      );
    }

    if (turnElements.length) {
      turnElements.forEach((node) => {
        const dataContent = node.getAttribute('data-content') || '';
        const dataAuthor = (node.getAttribute('data-message-author-role') || '').toLowerCase();
        const className = typeof node.className === 'string' ? node.className : '';
        const testId = node.getAttribute('data-testid') || '';

        const isUser =
          dataAuthor === 'user' ||
          testId === 'chatQuestion' ||
          testId === 'chat-turn-user' ||
          testId === 'user-turn' ||
          className.includes('UserMessage') ||
          dataContent === 'user-message' ||
          className.includes('user-message') ||
          testId === 'user-message';

        if (isUser) {
          const targetNode =
            node.querySelector(
              '[data-testid="chatOutput"], [data-testid="user-message-content"], .fai-UserMessage__message, [data-content="user-message"]',
            ) || node;
          const clone = targetNode.cloneNode(true);
          clone
            .querySelectorAll('.fai-UserMessage__accessibleHeading, .sr-only, button')
            .forEach((el) => el.remove());
          const text = clone.innerText || clone.textContent;
          if (text && text.trim()) {
            messages.push({ role: 'User', content: text.trim() });
          }
        } else {
          const targetNode =
            node.querySelector('[data-testid="markdown-reply"]') ||
            node.querySelector('[data-testid="ai-message-body"]') ||
            node.querySelector('[data-testid="copilot-message-content"]') ||
            node.querySelector('.fai-CopilotMessage__content') ||
            node.querySelector('[class*="group/ai-message-item"]') ||
            node;
          const html = processAiElement(targetNode);
          const markdown = convertToMarkdown(html);
          if (markdown && markdown.trim()) {
            messages.push({ role: 'Copilot', content: markdown });
          }
        }
      });
    }

    // Helper to extract messages from Shadow DOM cib-serp components (Classic Bing Chat / Copilot)
    const extractFromCibSerp = (rootDoc = document) => {
      try {
        const cibSerp = rootDoc.querySelector('cib-serp');
        if (!cibSerp || !cibSerp.shadowRoot) return [];
        const cibConversation = cibSerp.shadowRoot.querySelector('cib-conversation');
        if (!cibConversation || !cibConversation.shadowRoot) return [];
        const cibTurns = cibConversation.shadowRoot.querySelectorAll('cib-chat-turn');
        const results = [];

        cibTurns.forEach((turn) => {
          const turnRoot = turn.shadowRoot || turn;
          const msgGroups = turnRoot.querySelectorAll('cib-message-group');
          msgGroups.forEach((group) => {
            const source = (group.getAttribute('source') || '').toLowerCase();
            const role = source === 'user' ? 'User' : 'Copilot';
            const groupRoot = group.shadowRoot || group;
            const cibMessages = groupRoot.querySelectorAll('cib-message');

            cibMessages.forEach((msg) => {
              const msgRoot = msg.shadowRoot || msg;
              if (role === 'User') {
                const text = msgRoot.textContent?.trim();
                if (text) results.push({ role: 'User', content: text });
              } else {
                const shared = msgRoot.querySelector('cib-shared') || msgRoot;
                const html = processAiElement(shared);
                const md = convertToMarkdown(html);
                if (md && md.trim()) results.push({ role: 'Copilot', content: md.trim() });
              }
            });
          });
        });
        return results;
      } catch (err) {
        console.warn('[AI Exporter] Shadow DOM cib-serp extraction error:', err);
        return [];
      }
    };

    // Tier 4: Shadow DOM cib-serp components
    if (!messages.length) {
      const cibMessages = extractFromCibSerp(document);
      if (cibMessages.length) {
        messages.push(...cibMessages);
      }
    }

    // Tier 5: Web components in light DOM (cib-chat-turn / cib-message-group)
    if (!messages.length) {
      const cibTurns = document.querySelectorAll('cib-chat-turn');
      if (cibTurns.length) {
        cibTurns.forEach((turn) => {
          const source = (turn.getAttribute('source') || '').toLowerCase();
          const role = source === 'user' ? 'User' : 'Copilot';
          if (role === 'User') {
            const text = turn.innerText || turn.textContent;
            if (text && text.trim()) {
              messages.push({ role: 'User', content: text.trim() });
            }
          } else {
            const html = processAiElement(turn);
            const markdown = convertToMarkdown(html);
            if (markdown && markdown.trim()) {
              messages.push({ role: 'Copilot', content: markdown });
            }
          }
        });
      }
    }

    // Tier 6: React [data-turn-id] layout
    if (!messages.length) {
      const turnNodes = document.querySelectorAll('[data-turn-id]');
      turnNodes.forEach((node) => {
        const roleAttr = (
          node.getAttribute('data-turn-role') ||
          node.getAttribute('data-author') ||
          ''
        ).toLowerCase();
        const role = roleAttr.includes('user') ? 'User' : 'Copilot';

        if (role === 'User') {
          const text = node.innerText || node.textContent;
          if (text && text.trim()) {
            messages.push({ role: 'User', content: text.trim() });
          }
        } else {
          const html = processAiElement(node);
          const markdown = convertToMarkdown(html);
          if (markdown && markdown.trim()) {
            messages.push({ role: 'Copilot', content: markdown });
          }
        }
      });
    }

    // Tier 7: Universal role="article" scanner for Copilot
    if (!messages.length) {
      const articles = Array.from(document.querySelectorAll('[role="article"]'));
      articles.forEach((art) => {
        const headingText = (
          art.querySelector('h1, h2, h3, h4, h5, h6')?.textContent || ''
        ).toLowerCase();
        const ariaLabel = (
          art.getAttribute('aria-label') ||
          art.getAttribute('aria-labelledby') ||
          ''
        ).toLowerCase();
        const className = typeof art.className === 'string' ? art.className : '';

        const isUser =
          headingText.includes('you said') ||
          ariaLabel.includes('user-message') ||
          ariaLabel.includes('you said') ||
          className.includes('UserMessage') ||
          art.matches('[data-testid="chatQuestion"], [data-testid="user-message"]');

        const isCopilot =
          headingText.includes('copilot said') ||
          ariaLabel.includes('copilot-message') ||
          ariaLabel.includes('copilot said') ||
          className.includes('CopilotMessage') ||
          art.matches('[data-testid="copilot-message-div"], [data-testid="ai-message"]');

        if (isUser) {
          const clone = art.cloneNode(true);
          clone
            .querySelectorAll('h1, h2, h3, h4, h5, h6, .sr-only, button')
            .forEach((el) => el.remove());
          const text = clone.innerText || clone.textContent;
          if (text && text.trim()) {
            messages.push({ role: 'User', content: text.trim() });
          }
        } else if (isCopilot) {
          const targetNode =
            art.querySelector('[data-testid="markdown-reply"]') ||
            art.querySelector('.fai-CopilotMessage__content') ||
            art.querySelector('[data-testid="ai-message-body"]') ||
            art;
          const html = processAiElement(targetNode);
          const markdown = convertToMarkdown(html);
          if (markdown && markdown.trim()) {
            messages.push({ role: 'Copilot', content: markdown });
          }
        }
      });
    }

    // Tier 8: Check embedded iframe documents (e.g. Edge Sidebar panel iframe)
    if (!messages.length) {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      for (const iframe of iframes) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeCib = extractFromCibSerp(iframeDoc);
            if (iframeCib.length) {
              messages.push(...iframeCib);
              break;
            }
            const iframeTurns = Array.from(
              iframeDoc.querySelectorAll(
                '[data-testid="chatQuestion"], [data-testid="copilot-message-div"], [data-content="user-message"], [data-content="ai-message"]',
              ),
            );
            if (iframeTurns.length) {
              iframeTurns.forEach((node) => {
                const dataContent = node.getAttribute('data-content') || '';
                const testId = node.getAttribute('data-testid') || '';
                const isUser =
                  testId === 'chatQuestion' ||
                  dataContent === 'user-message' ||
                  testId === 'user-message';
                if (isUser) {
                  const targetNode =
                    node.querySelector(
                      '[data-testid="chatOutput"], .fai-UserMessage__message, [data-content="user-message"]',
                    ) || node;
                  const text = targetNode.innerText || targetNode.textContent;
                  if (text && text.trim()) messages.push({ role: 'User', content: text.trim() });
                } else {
                  const targetNode =
                    node.querySelector('[data-testid="markdown-reply"]') ||
                    node.querySelector('[data-testid="ai-message-body"]') ||
                    node;
                  const html = processAiElement(targetNode);
                  const markdown = convertToMarkdown(html);
                  if (markdown && markdown.trim()) {
                    messages.push({ role: 'Copilot', content: markdown });
                  }
                }
              });
              if (messages.length) break;
            }
          }
        } catch {
          // Ignore cross-origin iframe security restrictions
        }
      }
    }

    // Fallback title generation if default title is generic
    if (title === 'Copilot Conversation' && messages.length > 0 && messages[0].role === 'User') {
      const firstPrompt = messages[0].content.split('\n')[0].trim();
      if (firstPrompt) {
        title = firstPrompt.length > 40 ? `${firstPrompt.slice(0, 40)}...` : firstPrompt;
      }
    }

    const currentUrl =
      typeof window !== 'undefined' && window.location ? window.location.href || '' : '';
    const metadata = {
      Source: 'Copilot',
      Date: new Date().toLocaleString(),
      Link: currentUrl,
    };

    return { title, messages, url: currentUrl, metadata };
  }
}
