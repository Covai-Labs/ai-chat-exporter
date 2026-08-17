import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class GoogleSearchAIParser extends ChatParser {
  name = 'Google Search AI';
  isAvailable(url) {
    return /google\.[a-z.]+\/search/.test(url);
  }

  async parse() {
    const title = document.title || 'Google Search AI Overview';
    const messages = [];

    // 1. Extract the user's queries
    const queries = [];
    const queryElements = document.querySelectorAll('.sUKAcb');
    queryElements.forEach((el) => {
      // Clone the element to avoid mutating the live DOM
      const clone = el.cloneNode(true);
      const prefixEl = clone.querySelector('.iMqumd');
      if (prefixEl) {
        prefixEl.remove();
      }
      let text = clone.textContent || '';
      // Fallback regex cleanup if needed
      text = text.replace(/^\s*You\s+said:\s*/i, '').trim();
      if (text) {
        queries.push(text);
      }
    });

    // Fallback to single-turn query extraction if no turn query elements are found
    if (queries.length === 0) {
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
        queries.push(userQuery.trim());
      }
    }

    // 2. Extract SGE / AI Overview responses
    const responseContainers = [];
    const turnElements = document.querySelectorAll('[data-scope-id="turn"]');
    if (turnElements.length > 0) {
      turnElements.forEach((turnEl) => {
        const resEl =
          turnEl.querySelector('[data-container-id="main-col"]') ||
          turnEl.querySelector('[data-container-id="model-response-placeholder"]');
        if (resEl) {
          responseContainers.push(resEl);
        }
      });
    } else {
      // Fallback for pages without data-scope-id="turn"
      const resEl =
        document.querySelector('[data-container-id="main-col"]') ||
        document.querySelector('[data-container-id="model-response-placeholder"]');
      if (resEl) {
        responseContainers.push(resEl);
      }
    }

    // Pair queries and responses in order
    const minLength = Math.min(queries.length, responseContainers.length);
    for (let i = 0; i < minLength; i++) {
      messages.push({ role: 'User', content: queries[i].trim() });
      const text = convertToMarkdown(responseContainers[i]);
      if (text.trim()) {
        messages.push({ role: 'Model', content: text.trim() });
      }
    }

    // If there is a trailing user query with no response container (yet)
    if (queries.length > responseContainers.length) {
      messages.push({ role: 'User', content: queries[queries.length - 1].trim() });
    }

    const currentUrl =
      typeof window !== 'undefined' && window.location ? window.location.href || '' : '';
    const metadata = {
      Source: 'Google Search AI',
      Date: new Date().toLocaleString(),
      Link: currentUrl,
    };

    return { title, messages, url: currentUrl, metadata };
  }
}
