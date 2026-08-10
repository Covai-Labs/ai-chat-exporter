// Background service worker
// Currently used for handling extension installation events or global context menus

const UNINSTALL_URL = 'https://ai-chat-exporter.covai.org/uninstall-feedback.html';
const WELCOME_URL = 'https://ai-chat-exporter.covai.org/welcome.html';

chrome.runtime.setUninstallURL(UNINSTALL_URL);

const TARGET_MATCHES = [
  '*://chatgpt.com/*',
  '*://gemini.google.com/*',
  '*://claude.ai/*',
  '*://qwen.ai/*',
  '*://chat.qwen.ai/*',
  '*://www.perplexity.ai/*',
  '*://chat.deepseek.com/*',
  '*://www.meta.ai/*',
  '*://meta.ai/*',
  '*://chat.mistral.ai/*',
  '*://chat.z.ai/*',
  '*://console.cloud.google.com/*',
  '*://aistudio.google.com/*',
  '*://notebooklm.google.com/*',
  '*://copilot.microsoft.com/*',
  '*://www.copilot.microsoft.com/*',
  '*://copilot.com/*',
  '*://www.copilot.com/*',
  '*://lumo.proton.me/*',
  '*://www.google.com/*',
  '*://www.google.co.in/*',
  '*://www.google.co.uk/*',
  '*://www.google.ca/*',
  '*://www.google.com.au/*',
  '*://www.google.de/*',
  '*://www.google.fr/*',
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
  meta: 'https://www.meta.ai/',
  z_ai: 'https://chat.z.ai/',
  aistudio: 'https://aistudio.google.com/',
  lumo: 'https://lumo.proton.me/',
};

async function syncSidePanelBehavior() {
  const sidePanelApi = typeof chrome !== 'undefined' ? chrome['sidePanel'] : undefined;
  if (sidePanelApi && typeof sidePanelApi['setPanelBehavior'] === 'function') {
    try {
      const data = await chrome.storage.sync.get('launchMode');
      const openPanelOnActionClick = data.launchMode === 'sidepanel';
      await sidePanelApi['setPanelBehavior']({ openPanelOnActionClick });
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

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('AI Chat Exporter installed/updated:', details?.reason);

  if (details?.reason === 'install') {
    try {
      await chrome.tabs.create({ url: WELCOME_URL });
    } catch (e) {
      console.warn('[AI Exporter Background] Failed to open welcome page:', e);
    }
  }

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
        const sidePanelApi = typeof chrome !== 'undefined' ? chrome['sidePanel'] : undefined;
        if (sidePanelApi && typeof sidePanelApi['open'] === 'function') {
          let windowId = request.windowId || sender.tab?.windowId;
          if (!windowId) {
            const currentWin = await chrome.windows.getCurrent();
            windowId = currentWin.id;
          }
          await sidePanelApi['open']({ windowId });
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

    const uriAppTargets = ['obsidian', 'logseq', 'bear', 'noteplan', 'drafts'];
    if (uriAppTargets.includes(target)) {
      (async () => {
        try {
          const syncData = await chrome.storage.sync.get('obsidianVaultName');
          const vault = syncData.obsidianVaultName || '';
          const title = request.title || 'AI Conversation';
          const content = request.payload || '';

          const cleanTitle =
            title
              .replace(/[#|^[\]]/g, '')
              .replace(/[/\\?%*:|"<>]/g, '')
              .trim()
              .slice(0, 245) || 'AI Conversation';

          let appUri = '';
          if (target === 'obsidian') {
            const params = new URLSearchParams();
            params.append('name', cleanTitle);
            if (vault && vault.trim().length > 0) params.append('vault', vault.trim());
            if (content) params.append('content', content);
            appUri = `obsidian://new?${params.toString()}`;
          } else if (target === 'logseq') {
            const params = new URLSearchParams();
            params.append('page', cleanTitle);
            if (content) params.append('content', content);
            appUri = `logseq://x-callback-url/quickCapture?${params.toString()}`;
          } else if (target === 'bear') {
            const params = new URLSearchParams();
            params.append('title', cleanTitle);
            if (content) params.append('text', content);
            appUri = `bear://x-callback-url/create?${params.toString()}`;
          } else if (target === 'noteplan') {
            const params = new URLSearchParams();
            params.append('noteTitle', cleanTitle);
            if (content) params.append('text', content);
            appUri = `noteplan://x-callback-url/addText?${params.toString()}`;
          } else if (target === 'drafts') {
            const params = new URLSearchParams();
            const fullText = cleanTitle ? `# ${cleanTitle}\n\n${content}` : content;
            params.append('text', fullText);
            appUri = `drafts://x-callback-url/create?${params.toString()}`;
          }

          await chrome.tabs.create({ url: appUri });
          sendResponse({ success: true, uri: appUri });
        } catch (e) {
          console.error(`[AI Exporter Background] ${target} transfer failed:`, e);
          sendResponse({ success: false, error: e.message });
        }
      })();
      return true;
    }

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
