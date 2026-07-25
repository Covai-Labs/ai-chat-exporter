document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const chatInfoEl = document.getElementById('chat-info');
  const actionsEl = document.getElementById('actions');
  const errorEl = document.getElementById('error-msg');
  const chatTitleEl = document.getElementById('chat-title');
  const msgCountEl = document.getElementById('message-count');
  const exportBtn = document.getElementById('export-btn');
  const copyBtn = document.getElementById('copy-btn');
  const previewBtn = document.getElementById('preview-btn');
  const formatSelect = document.getElementById('format-select');
  const includeImagesCheckbox = document.getElementById('include-images-checkbox');
  const filenameInput = document.getElementById('filename-input');
  const continueTargetSelect = document.getElementById('continue-target-select');
  const previewableFormats = new Set(['markdown', 'json', 'html']);
  const copyableFormats = new Set(['markdown', 'json', 'html']);

  const openOptionsBtn = document.getElementById('open-options-btn');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
      }
    });
  }

  // Load saved defaults from chrome.storage.sync
  const storedSettings = await chrome.storage.sync.get([
    'defaultFormat',
    'includeImages',
    'defaultTransferTarget',
    'parserMode',
  ]);
  if (storedSettings.defaultFormat && formatSelect) {
    formatSelect.value = storedSettings.defaultFormat;
  }
  if (storedSettings.includeImages !== undefined && includeImagesCheckbox) {
    includeImagesCheckbox.checked = storedSettings.includeImages;
  }
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const openSidepanelBtn = document.getElementById('open-sidepanel-btn');
  if (openSidepanelBtn) {
    if (typeof chrome === 'undefined' || !chrome.sidePanel) {
      openSidepanelBtn.style.display = 'none';
    } else {
      openSidepanelBtn.addEventListener('click', async () => {
        try {
          if (tab && tab.windowId) {
            await chrome.sidePanel.open({ windowId: tab.windowId });
          } else {
            await chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL' });
          }
          window.close();
        } catch (err) {
          console.error('[Popup] Failed to open side panel:', err);
        }
      });
    }
  }

  if (!tab) {
    statusEl.textContent = 'Error: No active tab';
    return;
  }

  // Ping the content script to see if a parser is available.
  // The content script uses ES modules, so its imports may still be loading
  // when the popup opens. We retry a few times to handle that race condition.
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500;

  async function checkAvailability() {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'CHECK_AVAILABILITY',
        });
        if (response && response.available) {
          statusEl.textContent = `Detected: ${response.platform}`;
          const displayTitle = response.title || tab.title || 'Untitled Chat';
          chatTitleEl.textContent = displayTitle;
          msgCountEl.textContent = `${response.count || 0} messages found`;
          if (filenameInput) {
            const safeDefault = displayTitle.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
            filenameInput.value = safeDefault;
          }
          if (continueTargetSelect) {
            const platformKey = (response.platform || '').toLowerCase();
            let target = storedSettings.defaultTransferTarget || 'claude';
            if (platformKey.includes('chatgpt') && target === 'chatgpt') {
              target = 'claude';
            } else if (platformKey.includes('claude') && target === 'claude') {
              target = 'chatgpt';
            }
            continueTargetSelect.value = target;
          }
          chatInfoEl.classList.remove('hidden');
          actionsEl.classList.remove('hidden');
          return; // success — stop retrying
        } else {
          // Parser responded but no compatible chat found; no point retrying.
          showError();
          return;
        }
      } catch (e) {
        const isNotReady = e.message && e.message.includes('Receiving end does not exist');
        if (!isNotReady) {
          console.error(e);
          showError();
          return;
        }
        // Content script not ready yet — wait and retry (unless it's the last attempt)
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    // All retries exhausted
    showError();
  }

  const pngWarningBanner = document.getElementById('png-warning-banner');
  const pngQualityContainer = document.getElementById('png-quality-container');
  const pngQualityCheckbox = document.getElementById('png-quality-checkbox');

  function updateCopyButtonVisibility() {
    const format = formatSelect.value;
    const isCopyable = copyableFormats.has(format);
    const isPreviewable = previewableFormats.has(format);
    copyBtn.classList.toggle('hidden', !isCopyable);
    previewBtn.classList.toggle('hidden', !isPreviewable);
    if (pngWarningBanner) {
      pngWarningBanner.classList.toggle('hidden', format !== 'png');
    }
    if (pngQualityContainer) {
      pngQualityContainer.classList.toggle('hidden', format !== 'png');
    }
  }

  function showError() {
    statusEl.textContent = 'Not Supported';
    errorEl.classList.remove('hidden');
  }

  formatSelect.addEventListener('change', updateCopyButtonVisibility);
  updateCopyButtonVisibility();

  await checkAvailability();

  exportBtn.addEventListener('click', async () => {
    const format = formatSelect.value;
    const customFilename = filenameInput ? filenameInput.value.trim() : '';
    exportBtn.disabled = true;
    exportBtn.textContent = format === 'png' ? 'Rendering PNG (please wait)...' : 'Exporting...';

    try {
      if (format === 'pdf') {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'COPY_CHAT',
          format: 'html',
          includeImages: includeImagesCheckbox.checked,
          parserMode: storedSettings.parserMode || 'auto',
        });

        if (response && response.success) {
          await chrome.storage.local.set({
            previewContent: response.content,
            previewTitle: customFilename || tab.title || 'Untitled Chat',
            previewFormat: 'pdf',
            autoPrint: true,
          });

          await chrome.tabs.create({
            url: chrome.runtime.getURL('popup/preview.html'),
          });

          statusEl.textContent = 'Export Successful!';
        } else {
          statusEl.textContent = 'Export Failed: ' + (response?.error || 'Unknown');
        }
      } else {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'EXPORT_CHAT',
          format: format,
          includeImages: includeImagesCheckbox.checked,
          customFilename: customFilename,
          highQualityPng: pngQualityCheckbox ? pngQualityCheckbox.checked : true,
          parserMode: storedSettings.parserMode || 'auto',
        });

        if (response && response.success) {
          statusEl.textContent = 'Export Successful!';
        } else {
          statusEl.textContent = 'Export Failed: ' + (response?.error || 'Unknown');
        }
      }
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export Chat';
    }
  });

  copyBtn.addEventListener('click', async () => {
    const format = formatSelect.value;
    copyBtn.disabled = true;
    copyBtn.textContent = 'Copying...';

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'COPY_CHAT',
        format: format,
        includeImages: includeImagesCheckbox.checked,
      });

      if (response && response.success) {
        if (
          response.htmlContent &&
          typeof ClipboardItem !== 'undefined' &&
          navigator.clipboard &&
          navigator.clipboard.write
        ) {
          try {
            const htmlBlob = new Blob([response.htmlContent], { type: 'text/html' });
            const textBlob = new Blob([response.content], { type: 'text/plain' });
            await navigator.clipboard.write([
              new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob,
              }),
            ]);
          } catch (writeErr) {
            console.warn('Dual-MIME clipboard write failed, falling back to text:', writeErr);
            await navigator.clipboard.writeText(response.content);
          }
        } else {
          await navigator.clipboard.writeText(response.content);
        }
        statusEl.textContent = 'Copied to Clipboard!';
      } else {
        statusEl.textContent = 'Copy Failed: ' + (response?.error || 'Unknown');
      }
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
    } finally {
      copyBtn.disabled = false;
      copyBtn.textContent = 'Copy to Clipboard';
    }
  });

  previewBtn.addEventListener('click', async () => {
    const format = formatSelect.value;
    previewBtn.disabled = true;
    previewBtn.textContent = 'Opening...';

    try {
      const formatToRequest = format === 'pdf' ? 'html' : format;
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'COPY_CHAT',
        format: formatToRequest,
        includeImages: includeImagesCheckbox.checked,
        parserMode: storedSettings.parserMode || 'auto',
      });

      if (response && response.success) {
        await chrome.storage.local.set({
          previewConversation: response.conversation || null,
          previewContent: response.content,
          previewTitle: response.conversation?.title || tab.title || 'Untitled Chat',
          previewFormat: format,
          autoPrint: false,
        });

        await chrome.tabs.create({
          url: chrome.runtime.getURL('popup/preview.html'),
        });

        statusEl.textContent = 'Opened in New Tab!';
      } else {
        statusEl.textContent = 'Preview Failed: ' + (response?.error || 'Unknown');
      }
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
    } finally {
      previewBtn.disabled = false;
      previewBtn.textContent = 'Open in Tab';
    }
  });

  const transferBtn = document.getElementById('transfer-btn');

  if (transferBtn) {
    transferBtn.addEventListener('click', async () => {
      const targetPlatform = continueTargetSelect ? continueTargetSelect.value : 'chatgpt';
      transferBtn.disabled = true;
      transferBtn.textContent = 'Transferring...';

      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'GET_CONTINUATION_PAYLOAD',
          includeImages: includeImagesCheckbox.checked,
        });

        if (response && response.success && response.payload) {
          await chrome.runtime.sendMessage({
            action: 'TRANSFER_CHAT',
            targetPlatform: targetPlatform,
            payload: response.payload,
          });
          statusEl.textContent = `Opening ${targetPlatform}...`;
        } else {
          statusEl.textContent = 'Transfer Failed: ' + (response?.error || 'No content');
        }
      } catch (e) {
        statusEl.textContent = 'Error: ' + e.message;
      } finally {
        transferBtn.disabled = false;
        transferBtn.textContent = '↗ Transfer To';
      }
    });
  }
});
