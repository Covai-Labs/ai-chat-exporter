document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('sp-status');
  const chatInfoCard = document.getElementById('chat-info-card');
  const actionsCard = document.getElementById('actions-card');
  const errorCard = document.getElementById('error-card');
  const chatTitleEl = document.getElementById('chat-title');
  const msgCountEl = document.getElementById('message-count');

  const filenameInput = document.getElementById('filename-input');
  const formatSelect = document.getElementById('format-select');
  const includeImagesCheckbox = document.getElementById('include-images-checkbox');

  const exportBtn = document.getElementById('export-btn');
  const copyBtn = document.getElementById('copy-btn');
  const tabPreviewBtn = document.getElementById('tab-preview-btn');

  const transferBtn = document.getElementById('transfer-btn');
  const continueTargetSelect = document.getElementById('continue-target-select');

  const refreshPreviewBtn = document.getElementById('refresh-preview-btn');
  const previewStatusEl = document.getElementById('preview-status');
  const previewTextPane = document.getElementById('preview-text-pane');
  const previewHtmlPane = document.getElementById('preview-html-pane');

  const launchRadios = document.querySelectorAll('input[name="launch-mode"]');
  const saveMsg = document.getElementById('settings-save-msg');

  // Tab switching
  const tabBtns = document.querySelectorAll('.sp-tab-btn');
  const tabContents = document.querySelectorAll('.sp-tab-content');

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const activeContent = document.getElementById(targetTab);
      if (activeContent) {
        activeContent.classList.add('active');
      }
      if (targetTab === 'preview-tab') {
        loadLivePreview();
      }
    });
  });

  // Settings: Load & handle changes
  try {
    const data = await chrome.storage.sync.get('launchMode');
    const currentMode = data.launchMode || 'popup';
    launchRadios.forEach((r) => {
      r.checked = r.value === currentMode;
      r.addEventListener('change', async () => {
        if (r.checked) {
          await chrome.storage.sync.set({ launchMode: r.value });
          if (saveMsg) {
            saveMsg.classList.remove('hidden');
            setTimeout(() => saveMsg.classList.add('hidden'), 2000);
          }
        }
      });
    });
  } catch (err) {
    console.warn('[SidePanel] Failed to load launch settings:', err);
  }

  // Detect active tab & chat
  let activeTab = null;

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500;

  async function checkAvailability() {
    activeTab = await getActiveTab();
    if (!activeTab) {
      statusEl.textContent = 'No Active Tab';
      showError();
      return;
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'CHECK_AVAILABILITY',
        });
        if (response && response.available) {
          statusEl.textContent = `Detected: ${response.platform}`;
          const displayTitle = response.title || activeTab.title || 'Untitled Chat';
          chatTitleEl.textContent = displayTitle;
          msgCountEl.textContent = `${response.count || 0} messages found`;
          if (filenameInput) {
            const safeDefault = displayTitle.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
            filenameInput.value = safeDefault;
          }
          chatInfoCard.classList.remove('hidden');
          actionsCard.classList.remove('hidden');
          errorCard.classList.add('hidden');
          return;
        } else {
          showError();
          return;
        }
      } catch (e) {
        const isNotReady = e.message && e.message.includes('Receiving end does not exist');
        if (!isNotReady) {
          showError();
          return;
        }
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    showError();
  }

  function showError() {
    statusEl.textContent = 'Not Supported';
    chatInfoCard.classList.add('hidden');
    actionsCard.classList.add('hidden');
    errorCard.classList.remove('hidden');
  }

  await checkAvailability();

  const pngWarningBanner = document.getElementById('png-warning-banner');
  const pngQualityContainer = document.getElementById('png-quality-container');
  const pngQualityCheckbox = document.getElementById('png-quality-checkbox');

  function updatePngWarningVisibility() {
    if (formatSelect) {
      const isPng = formatSelect.value === 'png';
      if (pngWarningBanner) {
        pngWarningBanner.classList.toggle('hidden', !isPng);
      }
      if (pngQualityContainer) {
        pngQualityContainer.classList.toggle('hidden', !isPng);
      }
    }
  }

  if (formatSelect) {
    formatSelect.addEventListener('change', updatePngWarningVisibility);
    updatePngWarningVisibility();
  }

  // Export action
  exportBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    const format = formatSelect.value;
    const customFilename = filenameInput ? filenameInput.value.trim() : '';
    exportBtn.disabled = true;
    exportBtn.textContent = format === 'png' ? 'Rendering PNG (please wait)...' : 'Exporting...';

    try {
      if (format === 'pdf') {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'COPY_CHAT',
          format: 'html',
          includeImages: includeImagesCheckbox.checked,
        });

        if (response && response.success) {
          await chrome.storage.local.set({
            previewContent: response.content,
            previewTitle: customFilename || activeTab.title || 'Untitled Chat',
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
        const response = await chrome.tabs.sendMessage(activeTab.id, {
          action: 'EXPORT_CHAT',
          format: format,
          includeImages: includeImagesCheckbox.checked,
          customFilename: customFilename,
          highQualityPng: pngQualityCheckbox ? pngQualityCheckbox.checked : true,
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

  // Copy action
  copyBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    const format = formatSelect.value;
    copyBtn.disabled = true;
    copyBtn.textContent = 'Copying...';

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'COPY_CHAT',
        format: format === 'pdf' ? 'html' : format,
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
              new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
            ]);
          } catch (writeErr) {
            console.warn('[SidePanel] Dual-MIME clipboard write failed, falling back:', writeErr);
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

  // Open in Tab
  tabPreviewBtn.addEventListener('click', async () => {
    if (!activeTab) return;
    const format = formatSelect.value;
    tabPreviewBtn.disabled = true;
    tabPreviewBtn.textContent = 'Opening...';

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'COPY_CHAT',
        format: format === 'pdf' ? 'html' : format,
        includeImages: includeImagesCheckbox.checked,
      });

      if (response && response.success) {
        await chrome.storage.local.set({
          previewContent: response.content,
          previewTitle: activeTab.title || 'Untitled Chat',
          previewFormat: format,
          autoPrint: false,
        });

        await chrome.tabs.create({
          url: chrome.runtime.getURL('popup/preview.html'),
        });
        statusEl.textContent = 'Opened in New Tab!';
      }
    } catch (e) {
      statusEl.textContent = 'Error: ' + e.message;
    } finally {
      tabPreviewBtn.disabled = false;
      tabPreviewBtn.textContent = 'Open in Tab';
    }
  });

  // Transfer action
  if (transferBtn) {
    transferBtn.addEventListener('click', async () => {
      if (!activeTab) return;
      const targetPlatform = continueTargetSelect ? continueTargetSelect.value : 'chatgpt';
      transferBtn.disabled = true;
      transferBtn.textContent = 'Transferring...';

      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, {
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

  // Live preview pane loader
  async function loadLivePreview() {
    if (!activeTab) return;
    previewStatusEl.textContent = 'Loading live preview...';
    try {
      const format = formatSelect.value;
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'COPY_CHAT',
        format: format,
        includeImages: includeImagesCheckbox.checked,
      });

      if (response && response.success) {
        if (format === 'html' && response.htmlContent) {
          previewTextPane.classList.add('hidden');
          previewHtmlPane.classList.remove('hidden');
          previewHtmlPane.srcdoc = response.htmlContent;
        } else {
          previewHtmlPane.classList.add('hidden');
          previewTextPane.classList.remove('hidden');
          previewTextPane.textContent = response.content || 'No content';
        }
        previewStatusEl.textContent = `Preview loaded (${format})`;
      } else {
        previewStatusEl.textContent = 'Failed to load preview';
      }
    } catch (e) {
      previewStatusEl.textContent = 'Preview error: ' + e.message;
    }
  }

  refreshPreviewBtn.addEventListener('click', loadLivePreview);
});
