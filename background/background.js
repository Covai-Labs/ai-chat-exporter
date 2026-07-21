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
};

chrome.runtime.onInstalled.addListener(async () => {
  console.log('AI Chat Exporter installed/updated.');

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
