// Background service worker
// Currently used for handling extension installation events or global context menus

const TARGET_MATCHES = [
  '*://chatgpt.com/*',
  '*://gemini.google.com/*',
  '*://claude.ai/*',
  '*://qwen.ai/*',
  '*://www.perplexity.ai/*',
  '*://chat.deepseek.com/*',
];

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
