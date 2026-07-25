document.addEventListener('DOMContentLoaded', async () => {
  const titleEl = document.getElementById('preview-title');
  const codeEl = document.getElementById('preview-code');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const printBtn = document.getElementById('print-btn');

  // Toggle view elements
  const viewToggleContainer = document.getElementById('view-toggle-container');
  const viewCodeBtn = document.getElementById('view-code-btn');
  const viewRenderBtn = document.getElementById('view-render-btn');
  const codeWrapper = document.getElementById('code-wrapper');
  const renderWrapper = document.getElementById('render-wrapper');
  const previewRendered = document.getElementById('preview-rendered');

  let content = '';
  let title = 'Untitled Chat';
  let format = 'markdown';

  let currentBlobUrl = null;

  const setIframeContent = (htmlContent) => {
    if (currentBlobUrl) {
      URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    }
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
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

  const switchView = (view) => {
    if (view === 'code') {
      viewCodeBtn.classList.add('active');
      viewRenderBtn.classList.remove('active');
      codeWrapper.classList.remove('hidden');
      renderWrapper.classList.add('hidden');
    } else {
      viewCodeBtn.classList.remove('active');
      viewRenderBtn.classList.add('active');
      codeWrapper.classList.add('hidden');
      renderWrapper.classList.remove('hidden');
      if (
        !previewRendered.src ||
        previewRendered.src === 'about:blank' ||
        previewRendered.getAttribute('data-content') !== content
      ) {
        previewRendered.setAttribute('data-content', content);
        setIframeContent(content);
      }
    }
  };

  viewCodeBtn.addEventListener('click', () => switchView('code'));
  viewRenderBtn.addEventListener('click', () => switchView('render'));
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

      // Handle copy code clicks since inline handlers are blocked by CSP inside the extension
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
      'previewContent',
      'previewTitle',
      'previewFormat',
      'autoPrint',
    ]);

    content = data.previewContent || '';
    title = data.previewTitle || 'Untitled Chat';
    format = data.previewFormat || 'markdown';
    const autoPrint = data.autoPrint || false;

    titleEl.textContent = title;
    codeEl.textContent = content;

    const badgeEl = document.querySelector('.badge');
    if (badgeEl) {
      if (format === 'json') {
        badgeEl.textContent = 'JSON Preview';
      } else if (format === 'html' || format === 'pdf') {
        badgeEl.textContent = format === 'pdf' ? 'PDF Export & Preview' : 'HTML Preview';
        viewToggleContainer.classList.remove('hidden');
        if (printBtn) printBtn.classList.remove('hidden');

        if (autoPrint && format === 'pdf') {
          previewRendered.addEventListener(
            'load',
            () => {
              setTimeout(printIframe, 500);
            },
            { once: true },
          );
        }
        switchView('render');
      } else {
        badgeEl.textContent = 'Markdown Preview';
      }
    }
  } catch (error) {
    console.error('Failed to load preview data:', error);
    codeEl.textContent = 'Error loading content: ' + error.message;
  }

  // Copy button logic
  copyBtn.addEventListener('click', async () => {
    if (!content) return;
    copyBtn.disabled = true;
    const originalText = copyBtn.innerHTML;

    try {
      await navigator.clipboard.writeText(content);
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
    if (!content) return;

    let ext = 'md';
    let mimeType = 'text/markdown';
    if (format === 'json') {
      ext = 'json';
      mimeType = 'application/json';
    } else if (format === 'html' || format === 'pdf') {
      ext = 'html';
      mimeType = 'text/html';
    }
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const filename = `${sanitizedTitle || 'chat-export'}.${ext}`;

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
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
