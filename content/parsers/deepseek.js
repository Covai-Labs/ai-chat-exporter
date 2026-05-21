import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class DeepSeekParser extends ChatParser {
  isAvailable(url) {
    return url.includes('chat.deepseek.com');
  }

  async parse() {
    const title = document.title || 'DeepSeek Chat';
    const messages = [];

    // Selectors from research
    const userSelector = '.fbb737a4';
    const assistantSelector = '.ds-markdown';

    // We'll traverse the DOM to find these in order
    // DeepSeek seems to put messages in a container.
    // Let's try to get all candidate message elements in document order
    const allElements = document.querySelectorAll(`${userSelector}, ${assistantSelector}`);

    allElements.forEach((el) => {
      let role = 'Unknown';
      if (el.matches(userSelector)) {
        role = 'User';
      } else if (el.matches(assistantSelector)) {
        role = 'DeepSeek';
      }

      // Cleanup: remove copy buttons associated with code blocks if they capture text
      // (Note: might need to be careful not to modify the actual DOM if possible,
      // but for extraction textContent usually ignores hidden elements or we can clone)

      const text = convertToMarkdown(el);
      if (text.trim()) {
        messages.push({ role, content: text.trim() });
      }
    });

    // Fallback if the specific classes fail (e.g. class name rotation)
    if (messages.length === 0) {
      const messageRows = document.querySelectorAll('.ds-message-row, .message-row');
      messageRows.forEach((row) => {
        const isUser = row.classList.contains('ds-user-message');
        const role = isUser ? 'User' : 'DeepSeek';
        const text = convertToMarkdown(row);
        if (text.trim()) {
          messages.push({ role, content: text.trim() });
        }
      });
    }

    return { title, messages };
  }
}
