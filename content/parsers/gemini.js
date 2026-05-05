import { ChatParser } from './base.js';
import { convertToMarkdown, cleanMarkdown } from '../utils/html-to-markdown.js';

export class GeminiParser extends ChatParser {
    isAvailable(url) {
        return url.includes('gemini.google.com');
    }

    async parse() {
        //1. Title Extraction
        let title = '';

        // Strategy: Top Bar or Sidebar
        const possibleHeaders = document.querySelectorAll('h1, button[aria-haspopup="true"], button[aria-expanded]');

        for (const el of possibleHeaders) {
            const text = el.innerText.trim();
            if (text.length > 5 &&
                !text.includes('Gemini') &&
                !text.includes('Help') &&
                !text.includes('Settings')) {

                const rect = el.getBoundingClientRect();
                if (rect.top < 100 && rect.left > 50) {
                    title = text;
                    break;
                }
            }
        }

        if (!title) {
            const activeNav = document.querySelector('a[aria-current="page"], .selected');
            if (activeNav) title = activeNav.innerText;
        }

        if (!title) {
            title = document.title.replace(/Google/g, '').replace(/Gemini/g, '').replace(/- /g, '').trim();
        }

        if (!title || title.length < 2) {
            title = 'Gemini Conversation';
        }

        const messages = [];
        const seenTexts = new Set();

        // 2. Content Extraction
        // Gemini has conversation containers that hold user-query and model-response pairs
        // Each conversation turn is in a .conversation-container

        const conversationContainers = document.querySelectorAll('.conversation-container');

        conversationContainers.forEach(container => {
            // First, check for user query
            const userQuery = container.querySelector('user-query');
            if (userQuery) {
                const queryText = userQuery.querySelector('.query-text');
                if (queryText) {
                    const userText = queryText.innerText.trim();
                    if (userText && !seenTexts.has(userText)) {
                        seenTexts.add(userText);
                        messages.push({
                            role: 'User',
                            content: userText
                        });
                    }
                }
            }

            // Then, check for model response
            const modelResponse = container.querySelector('model-response');
            if (modelResponse) {
                const messageContent = modelResponse.querySelector('message-content');
                if (messageContent) {
                    const markdownDiv = messageContent.querySelector('.markdown.markdown-main-panel, .markdown');
                    if (markdownDiv) {
                        // Clone to avoid modifying the original DOM
                        const clone = markdownDiv.cloneNode(true);

                        // Remove UI elements that shouldn't be in the export
                        clone.querySelectorAll('button, .thoughts-container, .thoughts-wrapper, model-thoughts, .table-footer, .hide-from-message-actions').forEach(el => el.remove());

                        // Remove response-element wrappers (they contain export buttons)
                        clone.querySelectorAll('response-element').forEach(el => {
                            // Keep the table but remove the wrapper
                            while (el.firstChild) {
                                el.parentNode.insertBefore(el.firstChild, el);
                            }
                            el.remove();
                        });

                        // Convert to markdown
                        const text = convertToMarkdown(clone);

                        if (text && text.trim() && !seenTexts.has(text.trim())) {
                            seenTexts.add(text.trim());
                            messages.push({
                                role: 'Model',
                                content: text.trim()
                            });
                        }
                    }
                }
            }
        });

        return {
            title: title,
            messages: messages,
            url: window.location.href  // Add URL for metadata
        };
    }
}
