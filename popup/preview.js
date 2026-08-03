import { MarkdownFormatter } from '../content/formatters/markdown.js';
import { JsonFormatter } from '../content/formatters/json.js';
import { HtmlFormatter } from '../content/formatters/html.js';
import { DocFormatter } from '../content/formatters/doc.js';
import { ImageFormatter } from '../content/formatters/image.js';
import { ContinuationFormatter, stripEncodedImages } from '../content/formatters/continuation.js';

function applyTheme(theme, targetDoc = document) {
  if (!targetDoc || !targetDoc.documentElement) return;
  if (theme === 'dark') {
    targetDoc.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    targetDoc.documentElement.setAttribute('data-theme', 'light');
  } else {
    targetDoc.documentElement.removeAttribute('data-theme');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.self !== window.top) {
    document.documentElement.classList.add('in-iframe');
  }

  const titleEl = document.getElementById('preview-title');
  const codeEl = document.getElementById('preview-code');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const printBtn = document.getElementById('print-btn');
  const formatTabsContainer = document.getElementById('format-tabs');

  const pngWarningBanner = document.getElementById('png-warning-banner');
  const pngOptionsBar = document.getElementById('png-options-bar');
  const pngQualityCheckbox = document.getElementById('png-quality-checkbox');
  const includeImagesCheckbox = document.getElementById('include-images-checkbox');

  if (pngQualityCheckbox) {
    pngQualityCheckbox.addEventListener('change', () => {
      cachedPngBlob = null;
    });
  }
  if (includeImagesCheckbox) {
    includeImagesCheckbox.addEventListener('change', () => {
      cachedPngBlob = null;
    });
  }

  const codeWrapper = document.getElementById('code-wrapper');
  const renderWrapper = document.getElementById('render-wrapper');
  const previewRendered = document.getElementById('preview-rendered');

  const markdownFormatter = new MarkdownFormatter();
  const jsonFormatter = new JsonFormatter();
  const htmlFormatter = new HtmlFormatter();
  const docFormatter = new DocFormatter();
  const imageFormatter = new ImageFormatter();
  const continuationFormatter = new ContinuationFormatter();

  const transferBtn = document.getElementById('transfer-btn');
  const transferTargetSelect = document.getElementById('transfer-target-select');

  // Load and apply extension theme
  let currentSyncTheme = 'system';
  try {
    const syncData = await chrome.storage.sync.get('theme');
    currentSyncTheme = syncData.theme || 'system';
    applyTheme(currentSyncTheme, document);
  } catch {
    // Ignore theme loading errors when running standalone
  }

  const syncThemeToIframe = (theme) => {
    try {
      if (previewRendered && previewRendered.contentWindow) {
        previewRendered.contentWindow.postMessage({ action: 'setTheme', theme }, '*');
      }
    } catch {
      // Ignore iframe postMessage error
    }
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.theme) {
        currentSyncTheme = changes.theme.newValue || 'system';
        applyTheme(currentSyncTheme, document);
        syncThemeToIframe(currentSyncTheme);
      }
    });
  }

  let conversation = null;
  let title = 'Untitled Chat';
  let initialFormat = 'markdown';

  let htmlContent = '';
  let markdownContent = '';
  let jsonContent = '';
  let docContent = '';

  let activeContent = '';
  let activeExtension = 'html';

  let currentBlobUrl = null;
  let cachedPngBlob = null;

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
    const buttons = formatTabsContainer.querySelectorAll('.control-btn');
    buttons.forEach((btn) => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (pngWarningBanner) {
      pngWarningBanner.classList.toggle('hidden', tabName !== 'png');
    }
    if (pngOptionsBar) {
      pngOptionsBar.classList.toggle('hidden', tabName !== 'png');
    }

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
    syncThemeToIframe(currentSyncTheme);
  });

  try {
    const data = await chrome.storage.local.get([
      'previewConversation',
      'previewContent',
      'previewTitle',
      'previewFormat',
      'autoPrint',
      'autoDownloadPng',
      'highQualityPng',
      'includeImages',
    ]);

    conversation = data.previewConversation || null;
    title = data.previewTitle || 'Untitled Chat';
    initialFormat = data.previewFormat || 'markdown';
    const autoPrint = data.autoPrint || false;
    const autoDownloadPng = data.autoDownloadPng || false;

    if (pngQualityCheckbox && data.highQualityPng !== undefined) {
      pngQualityCheckbox.checked = data.highQualityPng;
    }
    if (includeImagesCheckbox && data.includeImages !== undefined) {
      includeImagesCheckbox.checked = data.includeImages;
    }

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

    if (autoDownloadPng && initialFormat === 'png') {
      setTimeout(() => {
        downloadBtn.click();
      }, 300);
    }
  } catch (error) {
    console.error('Failed to load preview data:', error);
    codeEl.textContent = 'Error loading content: ' + error.message;
  }

  // Copy button logic
  copyBtn.addEventListener('click', async () => {
    if (!activeContent && !cachedPngBlob) return;
    copyBtn.disabled = true;
    const originalText = copyBtn.innerHTML;

    try {
      if (
        activeExtension === 'png' &&
        cachedPngBlob &&
        typeof ClipboardItem !== 'undefined' &&
        navigator.clipboard &&
        navigator.clipboard.write
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': cachedPngBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(activeContent);
      }
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
  downloadBtn.addEventListener('click', async () => {
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const filename = `${sanitizedTitle || 'chat-export'}.${activeExtension}`;

    if (activeExtension === 'png') {
      const originalText = downloadBtn.innerHTML;
      try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Rendering PNG...';

        let pngBlob = cachedPngBlob;
        if (!pngBlob && conversation) {
          const isHighQuality = pngQualityCheckbox ? pngQualityCheckbox.checked : true;
          pngBlob = await imageFormatter.format(conversation, { highQuality: isHighQuality });
          cachedPngBlob = pngBlob;
        }

        if (!pngBlob) {
          throw new Error('PNG generation failed');
        }

        const url = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('[Preview] PNG download failed:', err);
        alert('PNG Download Failed: ' + err.message);
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalText;
      }
      return;
    }

    if (!activeContent) return;

    let mimeType = 'text/plain';
    let blobParts = [activeContent];

    if (activeExtension === 'html') {
      mimeType = 'text/html';
    } else if (activeExtension === 'doc') {
      mimeType = 'application/msword';
      blobParts = ['\ufeff', activeContent];
    } else if (activeExtension === 'json') {
      mimeType = 'application/json';
    } else if (activeExtension === 'md') {
      mimeType = 'text/markdown';
    }

    const blob = new Blob(blobParts, { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Transfer button logic
  if (transferBtn && transferTargetSelect) {
    transferBtn.addEventListener('click', async () => {
      const targetPlatform = transferTargetSelect.value || 'claude';
      const originalText = transferBtn.innerHTML;

      try {
        transferBtn.disabled = true;
        transferBtn.textContent = 'Transferring...';

        let payload = '';
        if (conversation) {
          payload = continuationFormatter.format(conversation);
        } else {
          payload = stripEncodedImages(markdownContent || activeContent);
        }

        await chrome.runtime.sendMessage({
          action: 'TRANSFER_CHAT',
          targetPlatform: targetPlatform,
          title: title || 'AI Conversation',
          payload: payload,
        });
      } catch (err) {
        console.error('[Preview] Transfer chat failed:', err);
        alert('Transfer failed: ' + err.message);
      } finally {
        transferBtn.disabled = false;
        transferBtn.innerHTML = originalText;
      }
    });
  }
});
