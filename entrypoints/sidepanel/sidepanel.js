import { initI18n, applyI18n, t } from '../../content/utils/i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  applyI18n();

  const statusEl = document.getElementById('sp-status');
  const headerRefreshBtn = document.getElementById('sp-refresh-btn');
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
    });
  });

  async function getActiveTab() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return null;
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) return tab;
    } catch {
      // Ignore
    }
    try {
      const [fallbackTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return fallbackTab || null;
    } catch {
      return null;
    }
  }

  async function checkAvailability() {
    if (!statusEl) return;
    try {
      const activeTab = await getActiveTab();
      if (!activeTab || !activeTab.id) {
        statusEl.textContent = 'No Active Tab';
        return;
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'CHECK_AVAILABILITY',
      });

      if (response && response.available) {
        statusEl.textContent = `${t('statusReady') || 'Ready'}: ${response.platform}`;
      } else {
        statusEl.textContent = t('statusError') || 'Not Supported';
      }
    } catch {
      statusEl.textContent = t('statusError') || 'Not Supported';
    }
  }

  async function refreshAllPanels() {
    await checkAvailability();
    const iframes = document.querySelectorAll('.sp-tab-iframe');
    iframes.forEach((iframe) => {
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ action: 'REFRESH_PANEL' }, '*');
          iframe.contentWindow.location.reload();
        } catch {
          const currentSrc = iframe.src;
          iframe.src = currentSrc;
        }
      }
    });
  }

  if (headerRefreshBtn) {
    headerRefreshBtn.addEventListener('click', async () => {
      await refreshAllPanels();
    });
  }

  if (typeof chrome !== 'undefined' && chrome.tabs) {
    if (chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(async () => {
        await refreshAllPanels();
      });
    }
    if (chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
        if (changeInfo.status === 'complete' || changeInfo.url || changeInfo.title) {
          const activeTab = await getActiveTab();
          if (activeTab && activeTab.id === tabId) {
            await refreshAllPanels();
          }
        }
      });
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'sync' && changes.uiLanguage) {
        await initI18n(changes.uiLanguage.newValue || 'auto');
        applyI18n();
      }
    });
  }

  await checkAvailability();
});
