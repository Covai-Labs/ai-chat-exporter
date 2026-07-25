/**
 * HTML to Markdown Converter Utility
 * Uses Turndown.js to convert HTML elements to markdown format
 */

// Note: Turndown.js will be loaded separately via manifest.json
// This utility provides a wrapper around it for consistent usage across parsers

/**
 * Convert an HTML element to markdown
 * @param {HTMLElement|string} htmlContent - HTML element or HTML string to convert
 * @param {Object} options - Optional configuration for the conversion
 * @returns {string} Markdown formatted text
 */
import TurndownService from '../lib/turndown.js';

/**
 * Convert an HTML element to markdown
 * @param {HTMLElement|string} htmlContent - HTML element or HTML string to convert
 * @param {Object} options - Optional configuration for the conversion
 * @returns {string} Markdown formatted text
 */
export function convertToMarkdown(htmlContent, options = {}) {
  // Configure Turndown service
  const turndownService = new TurndownService({
    headingStyle: 'atx', // Use # for headings (not underline style)
    hr: '* * *', // Horizontal rules
    bulletListMarker: '*', // Use * for bullet lists
    codeBlockStyle: 'fenced', // Use ``` for code blocks
    fence: '```', // Code block fence characters
    emDelimiter: '*', // Use * for emphasis
    strongDelimiter: '**', // Use ** for strong
    linkStyle: 'inlined', // [text](url) format
    linkReferenceStyle: 'full', // Full reference style for links
    ...options,
  });

  // Add custom rules for better conversion

  // Preserve line breaks
  turndownService.addRule('lineBreak', {
    filter: ['br'],
    replacement: () => '  \n',
  });

  // Handle Qwen's Monaco editor code blocks
  turndownService.addRule('qwenCodeBlock', {
    filter: function (node) {
      return node.nodeName === 'PRE' && node.classList.contains('qwen-markdown-code');
    },
    replacement: function (content, node) {
      // Extract language from header
      let language = '';
      const headerDiv = node.querySelector('.qwen-markdown-code-header div');
      if (headerDiv) {
        language = headerDiv.textContent.trim();
      }

      // Extract code from Monaco editor view-lines
      const viewLines = node.querySelectorAll('.view-line');
      const codeLines = [];
      viewLines.forEach((line) => {
        // Get text content, preserving structure
        let lineText = '';
        const spans = line.querySelectorAll('span');
        spans.forEach((span) => {
          // Replace &nbsp; with spaces and get text
          const text = span.textContent.replace(/\u00A0/g, ' ');
          lineText += text;
        });
        codeLines.push(lineText);
      });

      const code = codeLines.join('\n');
      if (!code.trim()) return '';

      return '\n```' + language + '\n' + code + '\n```\n';
    },
  });

  // Add table conversion rule
  turndownService.addRule('tables', {
    filter: 'table',
    replacement: function (content, node) {
      // Convert HTML table to markdown table
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) return content;

      // Create a separate Turndown service for cell content to avoid recursion/state issues
      // and incorrectly stripping or double-processing content
      const cellTurndown = new TurndownService({
        emDelimiter: '*',
        strongDelimiter: '**',
      });

      // Handle breaks in cells
      // Convert BR to newlines first so Turndown sees them as breaks (or handle directly)
      // Actually Turndown by default drops BRs or converts to newline.
      // We want to force them to <br> string for table cells.
      cellTurndown.addRule('lineBreak', {
        filter: ['br'],
        replacement: () => '<br>',
      });

      let markdown = '\n';
      rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));

        // Convert each cell's HTML to markdown using the isolated service
        const cellContents = cells.map((cell) => {
          let cellMarkdown = cellTurndown.turndown(cell.innerHTML);
          // Replace any actual newlines that Turndown generated (e.g. from P tags) with <br>
          // as tables cannot have literal newlines in GFM.
          return cellMarkdown.trim().replace(/\n/g, '<br>');
        });

        // Add row
        markdown += '| ' + cellContents.join(' | ') + ' |\n';

        // Add separator after header row
        if (rowIndex === 0) {
          markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
        }
      });

      return markdown + '\n';
    },
  });

  // Convert the HTML
  let html;
  if (typeof htmlContent === 'string') {
    html = htmlContent;
  } else if (
    htmlContent &&
    (htmlContent instanceof HTMLElement ||
      htmlContent.nodeType === 1 ||
      htmlContent.nodeType === 9 ||
      typeof htmlContent.querySelectorAll === 'function')
  ) {
    // Clone the element to avoid modifying the original
    const clone = htmlContent.cloneNode(true);

    // Convert math equations (KaTeX and data-math) to standard markdown math blocks
    // 1. Process block display KaTeX
    clone.querySelectorAll('.katex-display').forEach((el) => {
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) {
        const latex = annotation.textContent.trim();
        const textNode = clone.ownerDocument.createTextNode(`\n\n$$${latex}$$\n\n`);
        el.parentNode.replaceChild(textNode, el);
      } else {
        const textNode = clone.ownerDocument.createTextNode(`\n\n$$${el.textContent.trim()}$$\n\n`);
        el.parentNode.replaceChild(textNode, el);
      }
    });

    // 2. Process inline KaTeX
    clone.querySelectorAll('.katex').forEach((el) => {
      if (!el.parentNode) return;
      const annotation = el.querySelector('annotation[encoding="application/x-tex"]');
      if (annotation) {
        const latex = annotation.textContent.trim();
        const textNode = clone.ownerDocument.createTextNode(`$${latex}$`);
        el.parentNode.replaceChild(textNode, el);
      } else {
        const textNode = clone.ownerDocument.createTextNode(`$${el.textContent.trim()}$`);
        el.parentNode.replaceChild(textNode, el);
      }
    });

    // 3. Process Gemini-style data-math attributes
    clone.querySelectorAll('[data-math]').forEach((el) => {
      if (!el.parentNode) return;
      const latex = el.getAttribute('data-math');
      const isBlock = el.classList.contains('math-block') || el.tagName === 'DIV';
      const replacementText = isBlock ? `\n\n$$${latex}$$\n\n` : `$${latex}$`;
      const textNode = clone.ownerDocument.createTextNode(replacementText);
      el.parentNode.replaceChild(textNode, el);
    });

    // 4. Process Google Search SGE LaTeX images with [data-xpm-latex]
    clone.querySelectorAll('[data-xpm-latex]').forEach((el) => {
      const copyRoot = el.closest('[data-xpm-copy-root]');
      if (!copyRoot) return;
      const container = el.closest('.cPGBZb') || copyRoot;
      if (!container.parentNode) return;

      const latex = el.getAttribute('data-xpm-latex');

      // Determine if it is block math
      let isBlock = false;
      const parent = container.parentNode;
      if (parent) {
        const parentText = parent.textContent.replace(container.textContent, '').trim();
        isBlock = parentText === '';
      }

      const replacementText = isBlock ? `\n\n$$${latex}$$\n\n` : `$${latex}$`;
      const textNode = clone.ownerDocument.createTextNode(replacementText);
      container.parentNode.replaceChild(textNode, container);
    });

    // Preprocess code blocks (pre elements) to normalize formatting and language tags
    clone.querySelectorAll('pre').forEach((pre) => {
      // Guard against processing detached/already-replaced pre elements
      if (!clone.contains(pre)) return;

      const innerPre = pre.querySelector('pre');
      const codeElement = pre.querySelector('code');

      if (innerPre && codeElement) {
        // --- ChatGPT-style wrapped code block ---
        // Find the language label from the header (usually next to an SVG icon)
        let language = '';
        const svg = pre.querySelector('svg');
        if (svg && svg.parentElement) {
          const parent = svg.parentElement;
          svg.remove();
          language = parent.textContent.trim().toLowerCase();
        }

        // Replace all <br> elements inside the code block with actual newlines
        codeElement.querySelectorAll('br').forEach((br) => {
          if (br.parentNode) {
            const newline = clone.ownerDocument.createTextNode('\n');
            br.parentNode.replaceChild(newline, br);
          }
        });

        const codeText = codeElement.textContent;

        // Create a new clean pre and code element structure
        const newPre = clone.ownerDocument.createElement('pre');
        const newCode = clone.ownerDocument.createElement('code');
        if (language) {
          newCode.className = `language-${language}`;
        }
        newCode.textContent = codeText;
        newPre.appendChild(newCode);

        // Replace the outer pre with the new clean pre
        if (pre.parentNode) {
          pre.parentNode.replaceChild(newPre, pre);
        }
      } else {
        // --- Standard/SGE-style code block ---
        // Extract language label if available (e.g. from Google Search SGE containers)
        const code = pre.querySelector('code');
        const hasLanguage =
          code &&
          Array.from(code.classList).some(
            (cls) => cls.startsWith('language-') && cls !== 'language-',
          );
        if (!hasLanguage) {
          const container = pre.closest('.pHpOfb') || pre.parentElement?.parentElement;
          if (container) {
            const langEl =
              container.querySelector('.vVRw1d') || container.firstElementChild?.firstElementChild;
            if (langEl && langEl !== pre) {
              const language = langEl.textContent.trim().toLowerCase();
              if (code) {
                code.className = `language-${language}`;
              }
              langEl.remove();
            }
          }
        }

        // Replace all <br> elements inside the code block with actual newlines
        const codeEl = pre.querySelector('code') || pre;
        codeEl.querySelectorAll('br').forEach((br) => {
          if (br.parentNode) {
            const newline = clone.ownerDocument.createTextNode('\n');
            br.parentNode.replaceChild(newline, br);
          }
        });
      }
    });

    // Remove SGE "Use code with caution" text blocks
    clone.querySelectorAll('*').forEach((el) => {
      if (el.textContent.trim() === 'Use code with caution.') {
        el.remove();
      }
    });

    // Pre-process button-wrapped images (e.g., ChatGPT image carousels) before noise button removal
    clone.querySelectorAll('button').forEach((button) => {
      const img = button.querySelector('img');
      if (!img) return;

      let caption = 'Image';
      const ariaLabel = button.getAttribute('aria-label') || '';
      if (ariaLabel.toLowerCase().includes('open image details for')) {
        caption = ariaLabel.replace(/^Open image details for\s*/i, '').trim();
      } else if (img.getAttribute('alt') && !img.getAttribute('alt').startsWith('http')) {
        caption = img.getAttribute('alt').trim();
      }

      const alt = img.getAttribute('alt') || '';
      const src = img.getAttribute('src') || '';
      const imageUrl = alt.startsWith('http://') || alt.startsWith('https://') ? alt : src;

      if (imageUrl) {
        const newImg = clone.ownerDocument.createElement('img');
        newImg.setAttribute('src', imageUrl);
        newImg.setAttribute('alt', caption);
        button.parentNode.replaceChild(newImg, button);
      }
    });

    // Remove noise elements (buttons, icons, etc.)
    // Note: Exclude elements inside qwen-markdown-code to preserve Monaco editor content
    const noiseSelectors = [
      'button:not(.qwen-markdown-code *)',
      '.copy-button',
      '[role="button"]:not(.qwen-markdown-code *)',
      '.sr-only',
      'svg:not(.qwen-markdown-code *)',
      '.icon:not(.qwen-markdown-code *)',
      '[aria-hidden="true"]:not(.qwen-markdown-code *)',
      '[id^="shrproxy"]',
      '[id^="fbproxy"]',
      'div.HvurC',
      '.DBd2Wb',
      '.oLpkLe',
      '.OUQe0e',
      '.UrecDd',
      '[aria-label="Share public link"]',
      'aside.L9AUvd',
      'aside.UL0w9b',
      'div.qacuz',
    ];

    noiseSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    });

    html = clone;
  } else {
    console.warn('Invalid input to convertToMarkdown:', htmlContent);
    return '';
  }

  try {
    const markdown = turndownService.turndown(html);
    return markdown.trim();
  } catch (error) {
    console.error('Error converting HTML to markdown:', error);
    // Fallback to plain text
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.innerText || doc.body.textContent || '';
  }
}

/**
 * Clean up markdown text by removing common artifacts
 * @param {string} markdown - Markdown text to clean
 * @returns {string} Cleaned markdown
 */
export function cleanMarkdown(markdown) {
  return (
    markdown
      // Remove excessive blank lines (max 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Remove trailing whitespace from lines
      .replace(/[ \t]+$/gm, '')
      // Normalize horizontal rules
      .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '* * *')
      .trim()
  );
}
