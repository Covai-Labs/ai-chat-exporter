import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class ZAiParser extends ChatParser {
  name = 'Z.ai';
  isAvailable(url) {
    return url.includes('chat.z.ai');
  }

  async parse() {
    let title = '';
    const titleEl = document.querySelector('title');
    if (titleEl) {
      title = titleEl.textContent.trim().replace(/\s+/g, ' ');
    }
    if (!title && document.title) {
      title = document.title.trim().replace(/\s+/g, ' ');
    }
    title = title || 'Z.ai Chat';
    const messages = [];

    // Selectors for z.ai messages
    const userSelector = '.chat-user';
    const assistantSelector = '.chat-assistant';

    // We'll traverse the DOM to find these in order
    const allElements = document.querySelectorAll(`${userSelector}, ${assistantSelector}`);

    allElements.forEach((el) => {
      let role = 'Unknown';
      let contentEl = null;

      if (el.matches(userSelector)) {
        role = 'User';
        // Select user message text block (excluding edit/copy buttons)
        contentEl = el.querySelector('div.relative.overflow-hidden') || el;
      } else if (el.matches(assistantSelector)) {
        role = 'Z.ai';
        // Select assistant message content wrapper (excluding copy/regenerate buttons)
        const rawContentEl =
          el.querySelector('#response-content-container') ||
          el.querySelector('.markdown-prose') ||
          el;
        const contentElClone = rawContentEl.cloneNode(true);

        // Preprocess CodeMirror 6 code blocks into standard HTML <pre><code> structures
        contentElClone.querySelectorAll('.cm-editor').forEach((cmEditor) => {
          // Detect language from class names of the parent language container
          const languageWrapper = cmEditor.closest('[class*="language-"]');
          let language = '';
          if (languageWrapper) {
            const classList = Array.from(languageWrapper.classList);
            const langClass = classList.find((cls) => cls.startsWith('language-'));
            if (langClass) {
              language = langClass.replace('language-', '');
            }
          }

          // Extract the lines from CodeMirror editor view
          const lines = Array.from(cmEditor.querySelectorAll('.cm-line'));
          const codeText = lines.map((line) => line.textContent).join('\n');

          // Create new pre and code tags using the clone's owner document context
          const ownerDoc = cmEditor.ownerDocument || document;
          const pre = ownerDoc.createElement('pre');
          const code = ownerDoc.createElement('code');
          if (language) {
            code.className = `language-${language}`;
          }
          code.textContent = codeText;
          pre.appendChild(code);

          // Replace the enclosing language wrapper or cm-editor with the pre element
          const targetToReplace = languageWrapper || cmEditor;
          if (targetToReplace && targetToReplace.parentNode) {
            targetToReplace.parentNode.replaceChild(pre, targetToReplace);
          }
        });

        contentEl = contentElClone;
      }

      if (contentEl) {
        const text = convertToMarkdown(contentEl);
        if (text.trim()) {
          messages.push({ role, content: text.trim() });
        }
      }
    });

    const currentUrl =
      typeof window !== 'undefined' && window.location ? window.location.href || '' : '';
    const metadata = {
      Source: 'Z.ai',
      Date: new Date().toLocaleString(),
      Link: currentUrl,
    };

    return { title, messages, url: currentUrl, metadata };
  }
}
