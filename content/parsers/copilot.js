import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class CopilotParser extends ChatParser {
  isAvailable(url) {
    return (
      url.includes('copilot.microsoft.com') ||
      url.includes('copilot.com') ||
      url.includes('copilot.cloud.microsoft') ||
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
        '[data-testid="chatQuestion"], [data-testid="copilot-message-div"], [data-content="user-message"], [data-content="ai-message"], .fai-UserMessage, .fai-CopilotMessage',
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
        document.querySelectorAll('[class*="group/user-message"], [class*="group/ai-message"]'),
      );
    }

    // Tier 3: testid attributes
    if (!turnElements.length) {
      turnElements = Array.from(
        document.querySelectorAll('[data-testid="user-message"], [data-testid="ai-message"]'),
      );
    }

    if (turnElements.length) {
      turnElements.forEach((node) => {
        const dataContent = node.getAttribute('data-content') || '';
        const className = typeof node.className === 'string' ? node.className : '';
        const testId = node.getAttribute('data-testid') || '';

        const isUser =
          testId === 'chatQuestion' ||
          className.includes('UserMessage') ||
          dataContent === 'user-message' ||
          className.includes('user-message') ||
          testId === 'user-message';

        if (isUser) {
          const targetNode =
            node.querySelector(
              '[data-testid="chatOutput"], .fai-UserMessage__message, [data-content="user-message"]',
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

    // Tier 4: Web components (Angular Copilot layout: cib-chat-turn / cib-message-group)
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

    // Tier 5: React [data-turn-id] layout
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
