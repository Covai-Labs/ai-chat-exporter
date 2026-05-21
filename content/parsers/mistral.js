import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class MistralParser extends ChatParser {
  isAvailable(url) {
    return url.includes('chat.mistral.ai');
  }

  async parse() {
    // Extract Title
    const titleElement = document.querySelector('span.truncate.text-sm');
    let title = 'Mistral Conversation';
    if (titleElement && titleElement.innerText) {
      title = titleElement.innerText.trim();
    } else if (document.title) {
      title = document.title.replace(' - Mistral', '').trim();
    }

    const messages = [];
    const messageElements = document.querySelectorAll('[data-message-author-role]');

    for (const el of messageElements) {
      const role = el.getAttribute('data-message-author-role');

      if (role === 'user') {
        const contentEl =
          el.querySelector('.select-text') || el.querySelector('.whitespace-pre-wrap');
        if (contentEl) {
          messages.push({
            role: 'User',
            content: contentEl.innerText.trim(),
          });
        }
      } else if (role === 'assistant') {
        const answerEl = el.querySelector('[data-message-part-type="answer"]');
        if (answerEl) {
          const markdown = convertToMarkdown(answerEl.innerHTML);
          messages.push({
            role: 'Mistral',
            content: markdown,
          });
        }
      }
    }

    return { title, messages };
  }
}
