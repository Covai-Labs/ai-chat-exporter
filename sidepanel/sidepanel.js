document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('sp-status');
  const headerRefreshBtn = document.getElementById('sp-refresh-btn');
  const tabBtns = document.querySelectorAll('.sp-tab-btn');
  const tabContents = document.querySelectorAll('.sp-tab-content');

  // Tab switching
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

  // Detect active tab & chat platform
  async function checkAvailability() {
    if (!statusEl) return;
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        statusEl.textContent = 'No Active Tab';
        return;
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'CHECK_AVAILABILITY',
      });

      if (response && response.available) {
        statusEl.textContent = `Detected: ${response.platform}`;
      } else {
        statusEl.textContent = 'Not Supported';
      }
    } catch {
      statusEl.textContent = 'Not Supported';
    }
  }

  // Refresh button action
  if (headerRefreshBtn) {
    headerRefreshBtn.addEventListener('click', async () => {
      await checkAvailability();
      const activeIframe = document.querySelector('.sp-tab-content.active iframe');
      if (activeIframe && activeIframe.contentWindow) {
        try {
          activeIframe.contentWindow.location.reload();
        } catch {
          const currentSrc = activeIframe.src;
          activeIframe.src = currentSrc;
        }
      }
    });
  }

  // Listen for tab switching and updates to auto-refresh side panel status
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    if (chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(async () => {
        await checkAvailability();
      });
    }
    if (chrome.tabs.onUpdated) {
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
        if (changeInfo.status === 'complete') {
          await checkAvailability();
        }
      });
    }
  }

  await checkAvailability();
});
