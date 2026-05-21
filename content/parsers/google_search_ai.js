import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class GoogleSearchAIParser extends ChatParser {
  isAvailable(url) {
    return /google\.[a-z.]+\/search/.test(url);
  }

  async parse() {
    const title = document.title || 'Google Search AI Overview';
    const messages = [];

    // 1. Extract the user's query
    let userQuery = '';
    const uqEl = document.querySelector('[data-uq]');
    if (uqEl) {
      userQuery = uqEl.getAttribute('data-uq');
    }
    if (!userQuery) {
      const qEl = document.querySelector('[data-q]');
      if (qEl) {
        userQuery = qEl.getAttribute('data-q');
      }
    }
    if (!userQuery) {
      try {
        const url = new URL(window.location.href);
        userQuery = url.searchParams.get('q');
      } catch {
        // Ignore invalid URLs
      }
    }
    if (!userQuery) {
      const textarea =
        document.querySelector('textarea.gLFyf') ||
        document.querySelector('textarea.ITIRGe') ||
        document.querySelector('input[name="q"]');
      if (textarea) {
        userQuery = textarea.value || textarea.textContent;
      }
    }

    if (userQuery) {
      messages.push({ role: 'User', content: userQuery.trim() });
    }

    // 2. Extract the SGE / AI Overview response
    const responseContainer =
      document.querySelector('[data-container-id="main-col"]') ||
      document.querySelector('[data-container-id="model-response-placeholder"]');

    if (responseContainer) {
      const text = convertToMarkdown(responseContainer);
      if (text.trim()) {
        messages.push({ role: 'Model', content: text.trim() });
      }
    }

    return { title, messages };
  }
}
