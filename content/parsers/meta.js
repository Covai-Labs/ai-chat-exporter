import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class MetaParser extends ChatParser {
  isAvailable(url) {
    return url.includes('meta.ai');
  }

  async parse() {
    // Try to get the conversation title from the input field or the header button
    const titleInput = document.querySelector('input[placeholder="Conversation title"]');
    const titleButton = document.querySelector('[data-slot="button"] span.truncate');
    const title =
      titleInput && titleInput.value
        ? titleInput.value
        : titleButton
          ? titleButton.innerText
          : 'Meta AI Session';

    const messages = [];

    // Find all possible message elements directly to avoid missing any that don't have a wrapper
    const messageElements = Array.from(
      document.querySelectorAll(
        '[data-message-type="user"], [data-testid="assistant-message"], [data-message-id$="_user"], [data-message-id$="_assistant"]',
      ),
    );

    // Keep only the outer-most elements if there are nested matches
    const uniqueElements = messageElements.filter((el) => {
      let parent = el.parentElement;
      while (parent) {
        if (messageElements.includes(parent)) {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    });

    uniqueElements.forEach((el) => {
      let role = 'Unknown';
      let content = '';

      // Check if the element itself identifies as user or assistant
      const isUser =
        el.matches('[data-message-type="user"]') ||
        (el.getAttribute('data-message-id') &&
          el.getAttribute('data-message-id').endsWith('_user'));
      const isAssistant =
        el.matches('[data-testid="assistant-message"]') ||
        (el.getAttribute('data-message-id') &&
          el.getAttribute('data-message-id').endsWith('_assistant'));

      if (isUser) {
        role = 'User';
        // User text is usually in a span with text-response class or simply pre-wrap
        const textEl =
          el.querySelector('[data-slot="text"].text-response') ||
          el.querySelector('.whitespace-pre-wrap');
        if (textEl) {
          content = convertToMarkdown(textEl);
        } else {
          content = convertToMarkdown(el);
        }
      } else if (isAssistant) {
        role = 'Meta AI';
        // Assistant content is typically styled in markdown-content or prose
        const contentEl =
          el.querySelector('.markdown-content') ||
          el.querySelector('.ur-markdown') ||
          el.querySelector('.prose');
        if (contentEl) {
          const clone = contentEl.cloneNode(true);

          // Remove noise elements (like citation pills, edit buttons, thinking status, etc)
          const noiseSelectors = [
            'button',
            '.ur-citation-pill',
            'svg',
            '[data-testid="citation-pill"]',
            '[data-testid="thinking-status"]',
          ];
          noiseSelectors.forEach((sel) => {
            clone.querySelectorAll(sel).forEach((n) => n.remove());
          });

          content = convertToMarkdown(clone);
        } else {
          content = convertToMarkdown(el);
        }
      }

      if (content) {
        messages.push({ role, content });
      }
    });

    const metadata = {
      Source: 'Meta AI',
      Date: new Date().toLocaleString(),
      Link: window.location.href,
    };

    return { title, messages, metadata };
  }
}
