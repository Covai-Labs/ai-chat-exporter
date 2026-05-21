document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const chatInfoEl = document.getElementById("chat-info");
  const actionsEl = document.getElementById("actions");
  const errorEl = document.getElementById("error-msg");
  const chatTitleEl = document.getElementById("chat-title");
  const msgCountEl = document.getElementById("message-count");
  const exportBtn = document.getElementById("export-btn");
  const copyBtn = document.getElementById("copy-btn");
  const formatSelect = document.getElementById("format-select");
  const copyableFormats = new Set(["markdown", "json"]);

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    statusEl.textContent = "Error: No active tab";
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
          action: "CHECK_AVAILABILITY",
        });
        if (response && response.available) {
          statusEl.textContent = `Detected: ${response.platform}`;
          chatTitleEl.textContent = tab.title || "Untitled Chat";
          msgCountEl.textContent = `${response.count || 0} messages found`;
          chatInfoEl.classList.remove("hidden");
          actionsEl.classList.remove("hidden");
          return; // success — stop retrying
        } else {
          // Parser responded but no compatible chat found; no point retrying.
          showError();
          return;
        }
      } catch (e) {
        const isNotReady =
          e.message && e.message.includes("Receiving end does not exist");
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
    copyBtn.classList.toggle("hidden", !copyableFormats.has(formatSelect.value));
  }

  function showError() {
    statusEl.textContent = "Not Supported";
    errorEl.classList.remove("hidden");
  }

  formatSelect.addEventListener("change", updateCopyButtonVisibility);
  updateCopyButtonVisibility();

  exportBtn.addEventListener("click", async () => {
    const format = formatSelect.value;
    exportBtn.disabled = true;
    exportBtn.textContent = "Exporting...";

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "EXPORT_CHAT",
        format: format,
      });

      if (response && response.success) {
        statusEl.textContent = "Export Successful!";
      } else {
        statusEl.textContent =
          "Export Failed: " + (response?.error || "Unknown");
      }
    } catch (e) {
      statusEl.textContent = "Error: " + e.message;
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "Export Chat";
    }
  });

  copyBtn.addEventListener("click", async () => {
    const format = formatSelect.value;
    copyBtn.disabled = true;
    copyBtn.textContent = "Copying...";

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "COPY_CHAT",
        format: format,
      });

      if (response && response.success) {
        await navigator.clipboard.writeText(response.content);
        statusEl.textContent = "Copied to Clipboard!";
      } else {
        statusEl.textContent = "Copy Failed: " + (response?.error || "Unknown");
      }
    } catch (e) {
      statusEl.textContent = "Error: " + e.message;
    } finally {
      copyBtn.disabled = false;
      copyBtn.textContent = "Copy to Clipboard";
    }
  });
});
