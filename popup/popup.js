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
  const previewableFormats = new Set(['markdown', 'json', 'html', 'pdf']);
  const copyableFormats = new Set(['markdown', 'json', 'html']);

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

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

  await checkAvailability();

  function updateCopyButtonVisibility() {
    const isCopyable = copyableFormats.has(formatSelect.value);
    const isPreviewable = previewableFormats.has(formatSelect.value);
    copyBtn.classList.toggle('hidden', !isCopyable);
    previewBtn.classList.toggle('hidden', !isPreviewable);
  }

  function showError() {
    statusEl.textContent = 'Not Supported';
    errorEl.classList.remove('hidden');
  }

  formatSelect.addEventListener('change', updateCopyButtonVisibility);
  updateCopyButtonVisibility();

  exportBtn.addEventListener('click', async () => {
    const format = formatSelect.value;
    const customFilename = filenameInput ? filenameInput.value.trim() : '';
    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';

    try {
      if (format === 'pdf') {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'COPY_CHAT',
          format: 'html',
          includeImages: includeImagesCheckbox.checked,
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
      });

      if (response && response.success) {
        await chrome.storage.local.set({
          previewContent: response.content,
          previewTitle: tab.title || 'Untitled Chat',
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
  const continueTargetSelect = document.getElementById('continue-target-select');

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
        transferBtn.textContent = '↗ Continue';
      }
    });
  }
});
