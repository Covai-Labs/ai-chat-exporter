import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class QwenParser extends ChatParser {
  isAvailable(url) {
    return url.includes('qwen.ai');
  }

  async parse() {
    // Try to get the actual chat title from multiple possible selectors
    const titleSelectors = [
      '.chat-item-drag-link-content-tip-text',
      '.ant-tooltip-inner',
      'input[placeholder*="title"]',
      '.chat-title',
      'h1',
      'title',
    ];

    let title = 'Qwen Chat';
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.value || element.innerText;
        if (text && text.trim() && text !== document.title) {
          title = text.trim();
          break;
        }
      }
    }

    const messages = [];

    // chat.qwen.ai uses specific class names
    const chatMessages = document.querySelectorAll('.qwen-chat-message');

    chatMessages.forEach((message) => {
      const isUser = message.classList.contains('qwen-chat-message-user');
      const role = isUser ? 'User' : 'Qwen';

      let content = '';
      let attachments = [];

      if (isUser) {
        // Extract attachments first
        const fileItems = message.querySelectorAll('.index-module__file-message-document___OjWnc');
        fileItems.forEach((item) => {
          const fileNameEl = item.querySelector('.fileitem-file-name-text');
          const fileExtEl = item.querySelector('.fileitem-file-name-ext');
          const fileSizeEl = item.querySelector('.fileitem-file-size span');

          if (fileNameEl && fileExtEl) {
            const fileName = fileNameEl.textContent.trim();
            const fileExt = fileExtEl.textContent.trim();
            const fileSize = fileSizeEl ? fileSizeEl.textContent.trim() : '';

            attachments.push({
              name: fileName + fileExt,
              size: fileSize,
            });
          }
        });

        // User messages are in .user-message-content
        const userContent = message.querySelector('.user-message-content');
        if (userContent) {
          content = convertToMarkdown(userContent);
        }
      } else {
        // Assistant messages are in .qwen-markdown elements
        const markdownContent = message.querySelector('.qwen-markdown');
        if (markdownContent) {
          content = convertToMarkdown(markdownContent);
        }
      }

      // Add attachments to content if any exist
      if (attachments.length > 0) {
        const attachmentList = attachments
          .map((att) => `- **${att.name}** (${att.size})`)
          .join('\n');
        content = content + '\n\n**Attachments:**\n' + attachmentList;
      }

      if (content && content.trim()) {
        messages.push({ role, content: content.trim() });
      }
    });

    return { title, messages };
  }
}
