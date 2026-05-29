document.addEventListener('DOMContentLoaded', async () => {
  const titleEl = document.getElementById('preview-title');
  const codeEl = document.getElementById('preview-code');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');

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
      if (previewRendered.srcdoc !== content) {
        previewRendered.srcdoc = content;
      }
    }
  };

  viewCodeBtn.addEventListener('click', () => switchView('code'));
  viewRenderBtn.addEventListener('click', () => switchView('render'));

  try {
    const data = await chrome.storage.local.get([
      'previewContent',
      'previewTitle',
      'previewFormat',
    ]);

    content = data.previewContent || '';
    title = data.previewTitle || 'Untitled Chat';
    format = data.previewFormat || 'markdown';

    titleEl.textContent = title;
    codeEl.textContent = content;

    const badgeEl = document.querySelector('.badge');
    if (badgeEl) {
      if (format === 'json') {
        badgeEl.textContent = 'JSON Preview';
      } else if (format === 'html') {
        badgeEl.textContent = 'HTML Preview';
        viewToggleContainer.classList.remove('hidden');
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
    } else if (format === 'html') {
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
