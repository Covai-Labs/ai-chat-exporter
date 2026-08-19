export default defineBackground(() => {
  const UNINSTALL_URL = 'https://ai-chat-exporter.covai.org/uninstall-feedback.html';
  const WELCOME_URL = 'https://ai-chat-exporter.covai.org/welcome.html';

  if (typeof chrome !== 'undefined' && chrome.runtime?.setUninstallURL) {
    chrome.runtime.setUninstallURL(UNINSTALL_URL);
  }

  const PLATFORM_URLS = {
    chatgpt: 'https://chatgpt.com/',
    claude: 'https://claude.ai/new',
    gemini: 'https://gemini.google.com/app',
    deepseek: 'https://chat.deepseek.com/',
    perplexity: 'https://www.perplexity.ai/',
    qwen: 'https://chat.qwen.ai/',
    mistral: 'https://chat.mistral.ai/',
    notebooklm: 'https://notebook.google.com/',
    copilot: 'https://copilot.microsoft.com/',
    meta: 'https://www.meta.ai/',
    z_ai: 'https://chat.z.ai/',
    aistudio: 'https://aistudio.google.com/',
    lumo: 'https://lumo.proton.me/',
  };

  const SUPPORTED_DOCUMENT_URL_PATTERNS = [
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
    '*://notebook.google.com/*',
    '*://copilot.microsoft.com/*',
    '*://www.copilot.microsoft.com/*',
    '*://copilot.com/*',
    '*://www.copilot.com/*',
    '*://copilot.cloud.microsoft/*',
    '*://m365.cloud.microsoft/*',
    '*://www.m365.cloud.microsoft/*',
    '*://www.bing.com/*',
    '*://bing.com/*',
    '*://edgeservices.bing.com/*',
    '*://lumo.proton.me/*',
    '*://www.google.com/*',
    '*://www.google.co.in/*',
    '*://www.google.co.uk/*',
    '*://www.google.ca/*',
    '*://www.google.com.au/*',
    '*://www.google.de/*',
    '*://www.google.fr/*',
  ];

  function setupContextMenus() {
    if (typeof chrome === 'undefined' || !chrome.contextMenus) return;

    chrome.contextMenus.removeAll(() => {
      const parentTitle = chrome.i18n?.getMessage('contextMenuParent') || 'Export AI Chat';
      const copyTitle = chrome.i18n?.getMessage('contextMenuCopyMarkdown') || 'Copy Markdown';
      const downloadTitle =
        chrome.i18n?.getMessage('contextMenuDownloadMarkdown') || 'Download Markdown';
      const previewTitle =
        chrome.i18n?.getMessage('contextMenuOpenPreview') || 'Open in Preview Tab';

      // Root item scoped only to supported AI chat platforms
      chrome.contextMenus.create({
        id: 'ai-exporter-root',
        title: parentTitle,
        contexts: ['page', 'selection'],
        documentUrlPatterns: SUPPORTED_DOCUMENT_URL_PATTERNS,
      });

      // Sub-item: Copy Markdown
      chrome.contextMenus.create({
        id: 'ai-exporter-copy-markdown',
        parentId: 'ai-exporter-root',
        title: `${copyTitle} (Alt+Shift+C)`,
        contexts: ['page', 'selection'],
        documentUrlPatterns: SUPPORTED_DOCUMENT_URL_PATTERNS,
      });

      // Sub-item: Download Markdown
      chrome.contextMenus.create({
        id: 'ai-exporter-download-markdown',
        parentId: 'ai-exporter-root',
        title: `${downloadTitle} (Alt+Shift+D)`,
        contexts: ['page', 'selection'],
        documentUrlPatterns: SUPPORTED_DOCUMENT_URL_PATTERNS,
      });

      // Sub-item: Open Preview Tab
      chrome.contextMenus.create({
        id: 'ai-exporter-open-preview',
        parentId: 'ai-exporter-root',
        title: `${previewTitle} (Alt+Shift+P)`,
        contexts: ['page', 'selection'],
        documentUrlPatterns: SUPPORTED_DOCUMENT_URL_PATTERNS,
      });
    });
  }

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

  if (typeof chrome !== 'undefined' && chrome.runtime?.onStartup) {
    chrome.runtime.onStartup.addListener(() => {
      syncSidePanelBehavior();
      setupContextMenus();
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.launchMode) {
        syncSidePanelBehavior();
      }
    });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
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
      setupContextMenus();
    });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
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
            } else if (
              typeof browser !== 'undefined' &&
              browser.sidebarAction &&
              typeof browser.sidebarAction.open === 'function'
            ) {
              await browser.sidebarAction.open();
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
  }

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

  async function handleCommand(command, previewPath = 'preview.html') {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;

    if (command === 'copy_markdown' || command === 'download_markdown') {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'EXECUTE_SHORTCUT',
          shortcutAction: command,
        });
      } catch (err) {
        console.warn(`[AI Exporter Background] Shortcut ${command} failed:`, err);
      }
    } else if (command === 'open_preview') {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'COPY_CHAT',
          format: 'markdown',
        });
        if (response && response.success) {
          await chrome.storage.local.set({
            previewConversation: response.conversation || null,
            previewContent: response.content,
            previewTitle: tab.title || 'AI Conversation',
            previewFormat: 'markdown',
          });
          await chrome.tabs.create({
            url: chrome.runtime.getURL(previewPath),
          });
        }
      } catch (err) {
        console.warn('[AI Exporter Background] Shortcut open_preview failed:', err);
      }
    }
  }

  if (typeof chrome !== 'undefined' && chrome.commands?.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
      handleCommand(command, 'preview.html');
    });
  }

  if (typeof chrome !== 'undefined' && chrome.contextMenus?.onClicked) {
    chrome.contextMenus.onClicked.addListener((info) => {
      if (info.menuItemId === 'ai-exporter-copy-markdown') {
        handleCommand('copy_markdown', 'preview.html');
      } else if (info.menuItemId === 'ai-exporter-download-markdown') {
        handleCommand('download_markdown', 'preview.html');
      } else if (info.menuItemId === 'ai-exporter-open-preview') {
        handleCommand('open_preview', 'preview.html');
      }
    });
  }
});
