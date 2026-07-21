// Background service worker
// Currently used for handling extension installation events or global context menus

const TARGET_MATCHES = [
  '*://chatgpt.com/*',
  '*://gemini.google.com/*',
  '*://claude.ai/*',
  '*://qwen.ai/*',
  '*://www.perplexity.ai/*',
  '*://chat.deepseek.com/*',
  '*://chat.z.ai/*',
  '*://copilot.microsoft.com/*',
];

const PLATFORM_URLS = {
  chatgpt: 'https://chatgpt.com/',
  claude: 'https://claude.ai/new',
  gemini: 'https://gemini.google.com/app',
  deepseek: 'https://chat.deepseek.com/',
  perplexity: 'https://www.perplexity.ai/',
  qwen: 'https://chat.qwen.ai/',
  mistral: 'https://chat.mistral.ai/',
  notebooklm: 'https://notebooklm.google.com/',
  copilot: 'https://copilot.microsoft.com/',
};

async function syncSidePanelBehavior() {
  if (
    typeof chrome !== 'undefined' &&
    chrome.sidePanel &&
    typeof chrome.sidePanel.setPanelBehavior === 'function'
  ) {
    try {
      const data = await chrome.storage.sync.get('launchMode');
      const openPanelOnActionClick = data.launchMode === 'sidepanel';
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick });
    } catch (err) {
      console.warn('[AI Exporter Background] Failed to set side panel behavior:', err);
    }
  }
}

if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(syncSidePanelBehavior);
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.launchMode) {
    syncSidePanelBehavior();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Chat Exporter installed/updated.');
  await syncSidePanelBehavior();

  // Inject content script into existing tabs
  for (const match of TARGET_MATCHES) {
    const tabs = await chrome.tabs.query({ url: match });
    for (const tab of tabs) {
      // Skip tabs that are not fully loaded or are discarded
      if (tab.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/loader.js'],
          });
          console.log(`Injected content script into tab ${tab.id} (${tab.url})`);
        } catch (err) {
          // Ignore errors (e.g. if script is already running or tab is restricted)
          console.log(`Failed to inject into tab ${tab.id}:`, err);
        }
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_SIDE_PANEL') {
    (async () => {
      try {
        if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
          let windowId = request.windowId || sender.tab?.windowId;
          if (!windowId) {
            const currentWin = await chrome.windows.getCurrent();
            windowId = currentWin.id;
          }
          await chrome.sidePanel.open({ windowId });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Side panel API unavailable' });
        }
      } catch (err) {
        console.error('[AI Exporter Background] Failed to open side panel:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'TRANSFER_CHAT') {
    const target = request.targetPlatform;
    const url = PLATFORM_URLS[target] || 'https://chatgpt.com/';

    (async () => {
      try {
        await chrome.storage.local.set({
          pendingContinuation: {
            payload: request.payload,
            targetPlatform: target,
            timestamp: Date.now(),
          },
        });

        await chrome.tabs.create({ url });
        sendResponse({ success: true });
      } catch (e) {
        console.error('[AI Exporter Background] Transfer failed:', e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
});
