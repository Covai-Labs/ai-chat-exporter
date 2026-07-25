import { MarkdownFormatter } from '../content/formatters/markdown.js';
import { JsonFormatter } from '../content/formatters/json.js';
import { HtmlFormatter } from '../content/formatters/html.js';
import { DocFormatter } from '../content/formatters/doc.js';

document.addEventListener('DOMContentLoaded', async () => {
  const titleEl = document.getElementById('preview-title');
  const codeEl = document.getElementById('preview-code');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const printBtn = document.getElementById('print-btn');
  const formatTabsContainer = document.getElementById('format-tabs');

  const codeWrapper = document.getElementById('code-wrapper');
  const renderWrapper = document.getElementById('render-wrapper');
  const previewRendered = document.getElementById('preview-rendered');

  const markdownFormatter = new MarkdownFormatter();
  const jsonFormatter = new JsonFormatter();
  const htmlFormatter = new HtmlFormatter();
  const docFormatter = new DocFormatter();

  let conversation = null;
  let title = 'Untitled Chat';
  let initialFormat = 'markdown';

  let htmlContent = '';
  let markdownContent = '';
  let jsonContent = '';
  let docContent = '';

  let activeTab = 'html-render';
  let activeContent = '';
  let activeExtension = 'html';

  let currentBlobUrl = null;

  const setIframeContent = (content) => {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    currentBlobUrl = URL.createObjectURL(blob);
    previewRendered.src = currentBlobUrl;
  };

  const printIframe = () => {
    if (!previewRendered) return;

    try {
      if (previewRendered.contentWindow) {
        previewRendered.contentWindow.focus();
        previewRendered.contentWindow.print();
        return;
      }
    } catch (err) {
      console.warn('[Preview] Direct iframe print failed:', err);
    }

    try {
      if (previewRendered.contentWindow) {
        previewRendered.contentWindow.postMessage({ action: 'print' }, '*');
      }
    } catch (err) {
      console.warn('[Preview] postMessage print failed:', err);
    }

    try {
      window.print();
    } catch (err) {
      console.error('[Preview] Fallback window.print() failed:', err);
    }
  };

  const switchTab = (tabName) => {
    activeTab = tabName;

    const buttons = formatTabsContainer.querySelectorAll('.control-btn');
    buttons.forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (tabName === 'html-render' || tabName === 'png') {
      activeContent = htmlContent;
      activeExtension = tabName === 'png' ? 'png' : 'html';
      codeWrapper.classList.add('hidden');
      renderWrapper.classList.remove('hidden');
      if (printBtn) {
        if (tabName === 'png') printBtn.classList.add('hidden');
        else printBtn.classList.remove('hidden');
      }

      if (
        !previewRendered.src ||
        previewRendered.src === 'about:blank' ||
        previewRendered.getAttribute('data-content') !== htmlContent
      ) {
        previewRendered.setAttribute('data-content', htmlContent);
        setIframeContent(htmlContent);
      }
    } else {
      renderWrapper.classList.add('hidden');
      codeWrapper.classList.remove('hidden');
      if (printBtn) printBtn.classList.add('hidden');

      if (tabName === 'html-source') {
        activeContent = htmlContent;
        activeExtension = 'html';
      } else if (tabName === 'markdown') {
        activeContent = markdownContent;
        activeExtension = 'md';
      } else if (tabName === 'json') {
        activeContent = jsonContent;
        activeExtension = 'json';
      } else if (tabName === 'doc') {
        activeContent = docContent;
        activeExtension = 'doc';
      }

      codeEl.textContent = activeContent;
    }
  };

  formatTabsContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.control-btn');
    if (btn && btn.hasAttribute('data-tab')) {
      switchTab(btn.getAttribute('data-tab'));
    }
  });

  if (printBtn) {
    printBtn.addEventListener('click', () => printIframe());
  }

  previewRendered.addEventListener('load', () => {
    try {
      const doc = previewRendered.contentDocument || previewRendered.contentWindow.document;
      if (!doc) return;

      const toggle = doc.getElementById('theme-toggle-checkbox');
      if (toggle) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isSystemDark) {
          doc.documentElement.setAttribute('data-theme', 'dark');
          toggle.checked = true;
        } else {
          doc.documentElement.removeAttribute('data-theme');
          toggle.checked = false;
        }

        toggle.addEventListener('change', (e) => {
          if (e.target.checked) {
            doc.documentElement.setAttribute('data-theme', 'dark');
          } else {
            doc.documentElement.removeAttribute('data-theme');
          }
        });
      }

      doc.addEventListener('click', async (e) => {
        const btn = e.target.closest('.copy-code-btn');
        if (btn) {
          const codeBlock = btn.closest('.code-card').querySelector('code');
          const span = btn.querySelector('span');
          const originalBtnText = span.textContent;

          try {
            await navigator.clipboard.writeText(codeBlock.textContent);
            span.textContent = 'Copied!';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#10b981';

            setTimeout(() => {
              span.textContent = originalBtnText;
              btn.style.borderColor = '';
              btn.style.color = '';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy text: ', err);
          }
        }
      });
    } catch (err) {
      console.error('Failed to initialize content inside iframe:', err);
    }
  });

  try {
    const data = await chrome.storage.local.get([
      'previewConversation',
      'previewContent',
      'previewTitle',
      'previewFormat',
      'autoPrint',
    ]);

    conversation = data.previewConversation || null;
    title = data.previewTitle || 'Untitled Chat';
    initialFormat = data.previewFormat || 'markdown';
    const autoPrint = data.autoPrint || false;

    titleEl.textContent = title;

    if (conversation) {
      htmlContent = htmlFormatter.format(conversation);
      markdownContent = markdownFormatter.format(conversation);
      jsonContent = jsonFormatter.format(conversation);
      docContent = docFormatter.format(conversation);
    } else {
      const fallbackContent = data.previewContent || '';
      htmlContent = fallbackContent;
      markdownContent = fallbackContent;
      jsonContent = fallbackContent;
      docContent = fallbackContent;
    }

    let initialTab = 'html-render';
    if (initialFormat === 'json') {
      initialTab = 'json';
    } else if (initialFormat === 'markdown') {
      initialTab = 'markdown';
    } else if (initialFormat === 'doc') {
      initialTab = 'doc';
    } else if (initialFormat === 'png') {
      initialTab = 'png';
    } else if (initialFormat === 'html' || initialFormat === 'pdf') {
      initialTab = 'html-render';
    }

    if (autoPrint && (initialFormat === 'pdf' || initialFormat === 'html')) {
      previewRendered.addEventListener(
        'load',
        () => {
          setTimeout(printIframe, 400);
        },
        { once: true },
      );
    }

    switchTab(initialTab);
  } catch (error) {
    console.error('Failed to load preview data:', error);
    codeEl.textContent = 'Error loading content: ' + error.message;
  }

  // Copy button logic
  copyBtn.addEventListener('click', async () => {
    if (!activeContent) return;
    copyBtn.disabled = true;
    const originalText = copyBtn.innerHTML;

    try {
      await navigator.clipboard.writeText(activeContent);
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        Copied!
      `;
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.disabled = false;
      }, 2000);
    } catch (e) {
      console.error(e);
      copyBtn.textContent = 'Copy Failed';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.disabled = false;
      }, 2000);
    }
  });

  // Download button logic
  downloadBtn.addEventListener('click', () => {
    if (!activeContent) return;

    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const filename = `${sanitizedTitle || 'chat-export'}.${activeExtension}`;

    let mimeType = 'text/plain';
    if (activeExtension === 'html' || activeExtension === 'doc') {
      mimeType = 'text/html';
    } else if (activeExtension === 'json') {
      mimeType = 'application/json';
    } else if (activeExtension === 'md') {
      mimeType = 'text/markdown';
    }

    const blob = new Blob([activeContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
