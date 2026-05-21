import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class PerplexityParser extends ChatParser {
  isAvailable(url) {
    return url.includes('perplexity.ai');
  }

  async parse() {
    const rawTitle =
      document.querySelector('.share-title-section h1')?.textContent ||
      document.querySelector('h1')?.textContent ||
      document.title ||
      'Perplexity Search';
    const title = rawTitle.trim().replace(/\s+/g, ' ');

    const messages = [];

    // Perplexity Container
    const threadContainer = document.querySelector('.max-w-threadContentWidth') || document.body;

    // Candidates for User Messages
    const userSelectors = [
      'h1.group\\/query',
      '.group\\/query',
      '.whitespace-pre-line.text-pretty',
      '[data-testid="search-bar-input"]', // fallback for input? typically input is not the message display
    ];

    // Candidates for Assistant Messages
    const assistantSelectors = ['div[id^="markdown-content-"]', '.prose'];

    // Strategy: Iterate children of thread container or find all matches in document
    // Thread container is better to preserve order

    // Let's select all potential message blocks within the thread container
    const selectorString = [...userSelectors, ...assistantSelectors].join(', ');
    const elements = threadContainer.querySelectorAll(selectorString);

    // Helper to determine role
    const getRole = (el) => {
      for (const s of userSelectors) {
        if (el.matches(s)) return 'User';
      }
      for (const s of assistantSelectors) {
        if (el.matches(s)) return 'Perplexity';
      }
      return 'Unknown';
    };

    const seenText = new Set();

    elements.forEach((el) => {
      // Perplexity nests things. Avoid duplicates if we selected a parent and a child.
      // Also avoid "Related" section queries if possible (usually separate container, check parents?)

      // Check if inside "related" or "sources"
      if (el.closest('[class*="related"], [class*="sources"]')) return;

      const role = getRole(el);
      let text = convertToMarkdown(el);
      text = text.trim();

      if (!text || seenText.has(text)) return;

      // Perplexity specific cleanup
      // Remove "Sources" label text if it gets captured?
      // Usually .prose contains the markdown answer.

      seenText.add(text);
      messages.push({ role, content: text });
    });

    return { title, messages };
  }
}
