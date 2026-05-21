import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

export class ClaudeParser extends ChatParser {
  isAvailable(url) {
    return url.includes('claude.ai');
  }

  async parse() {
    const title = document.title || 'Claude Chat';
    const messages = [];

    // Inject the React reader script if not already injected
    if (!document.getElementById('ai-export-claude-reader')) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/claude_react_reader.js');
      script.id = 'ai-export-claude-reader';
      script.onload = function () {
        this.remove(); // Clean up script tag
      };
      (document.head || document.documentElement).appendChild(script);
      // Give it a moment to initialize
      await new Promise((r) => setTimeout(r, 100));
    }

    // Helper to get artifact info
    const getArtifactInfo = (index) => {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'RspAtftInfo' && event.data.idx === index) {
            window.removeEventListener('message', handler);
            resolve(event.data.atftInfo);
          }
        };
        window.addEventListener('message', handler);
        window.postMessage({ type: 'ReqAtftInfo', idx: index }, window.location.origin);

        // Timeout fallback
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 1000); // 1s timeout
      });
    };

    // Claude Structure 2024/2025 Refinement
    // Messages are usually in a container. We want to capture the flow.
    // User messages are reliably [data-testid="user-message"]

    // Assistant messages are trickier. They often don't have a single specific class in newer builds.
    // However, they adhere to a structure. usually .font-claude-message OR just the block that isn't a user message.
    // Artifacts are .artifact-block-cell (which might be inside or outside the main text block depending on view)

    // Strategy: Select ALL potential top-level message containers.
    // A common pattern in Claude is a list of .group

    // Let's rely on the specific semantic markers we know exist:
    // 1. [data-testid="user-message"]
    // 2. .font-claude-message (Legacy/Stable?)
    // 3. .artifact-block-cell
    // 4. If those fail for assistant, we might need to look for specific container classes found in research.

    // Let's try a broad selection and filter.

    // We need to capture the *sequence*.
    // The most robust way is finding the main chat list container.
    // Usually `div.flex-1.overflow-y-auto` or similar contains the chat.

    // Let's assume the previous method of querying all specific items in document order is the safest fallback
    // IF we ensure we catch the assistant text.

    // UPDATED STRATEGY:
    // 1. Find all `div` elements that *contain* text but aren't too deep, roughly looking like messages? Too risky.
    // 2. Use the strict selectors but assume .font-claude-message might be missing.
    //    Look for `div.font-serif` or classes sharing stylistic properties?

    // Let's stick to the knowns but check strict ordering.
    // Precise selectors (Best formatting)
    const strictSelectors = [
      '[data-testid="user-message"]',
      '.font-claude-message',
      '.font-claude-response',
      '.artifact-block-cell',
    ].join(', ');

    // Fallback selectors (Good for missing content, but maybe less formatting)
    const fallbackSelectors = ['div.font-serif'].join(', ');

    const strictCandidates = Array.from(document.querySelectorAll(strictSelectors));
    const fallbackCandidates = Array.from(document.querySelectorAll(fallbackSelectors));

    // Filter fallbacks: Only keep them if they DO NOT overlap with any strict candidate
    // If a fallback contains a strict candidate, we prefer the strict (child) for better formatting.
    // If a fallback is inside a strict candidate, we prefer the strict (parent).
    const validFallbacks = fallbackCandidates.filter((fallback) => {
      const overlapsWithError = strictCandidates.some(
        (strict) => strict.contains(fallback) || fallback.contains(strict),
      );
      return !overlapsWithError;
    });

    // Combine and deduplicate
    // Use a Set to ensure uniqueness just in case
    const combined = [...new Set([...strictCandidates, ...validFallbacks])];

    // Sort by document position
    const allElements = combined.sort((a, b) => {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

    // Pre-calculate artifact indices
    const artifactElements = document.querySelectorAll('.artifact-block-cell');
    const artifactMap = new Map();
    artifactElements.forEach((el, index) => artifactMap.set(el, index));

    for (const el of allElements) {
      let role = 'Unknown';
      let content = '';

      if (el.matches('[data-testid="user-message"]')) {
        role = 'User';
        // Convert HTML to markdown
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button').forEach((btn) => btn.remove());
        content = convertToMarkdown(clone);
      } else if (
        el.matches('.font-claude-message') ||
        el.matches('.font-claude-response') ||
        el.matches('div.font-serif')
      ) {
        role = 'Claude';
        // Convert HTML to markdown
        const clone = el.cloneNode(true);
        clone.querySelectorAll('button').forEach((btn) => btn.remove());
        content = convertToMarkdown(clone);
      } else if (el.matches('.artifact-block-cell')) {
        role = 'Claude Artifact';

        const index = artifactMap.get(el);
        if (index !== undefined) {
          const info = await getArtifactInfo(index);
          if (info) {
            const artTitle = info.title || 'Artifact';
            const artContent = info.content || '';
            const artLang = info.language || 'text';
            if (artLang === 'markdown' || artLang === 'text') {
              // Render as quoted markdown block to allow formatting to be visible in preview
              const quotedContent = artContent
                .split('\n')
                .map((line) => `> ${line}`)
                .join('\n');
              content = `\n\n> **Artifact: ${artTitle}**\n\n${quotedContent}\n\n`;
            } else {
              content = `\n\n> **Artifact: ${artTitle}**\n\`\`\`${artLang}\n${artContent}\n\`\`\`\n\n`;
            }
          } else {
            // Fallback: try to read the header from DOM
            const header =
              el.querySelector('.flex.items-center.gap-2') || el.querySelector('.font-bold');
            const fallbackTitle = header ? header.innerText.split('\n')[0] : 'Unknown Artifact';
            content = `\n> [Artifact: ${fallbackTitle} - content extraction failed]\n`;
          }
        }
      }

      if (content) {
        messages.push({ role, content });
      }
    }

    // Backup heuristics removed as we now include .font-serif in the primary pass.

    const metadata = {
      Source: 'Claude',
      Date: new Date().toLocaleString(),
      Link: window.location.href,
      Model: 'Claude',
    };

    return { title, messages, metadata };
  }
}
