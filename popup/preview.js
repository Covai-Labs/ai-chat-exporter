document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("preview-title");
  const codeEl = document.getElementById("preview-code");
  const copyBtn = document.getElementById("copy-btn");
  const downloadBtn = document.getElementById("download-btn");

  let content = "";
  let title = "Untitled Chat";
  let format = "markdown";

  try {
    const data = await chrome.storage.local.get([
      "previewContent",
      "previewTitle",
      "previewFormat",
    ]);

    content = data.previewContent || "";
    title = data.previewTitle || "Untitled Chat";
    format = data.previewFormat || "markdown";

    titleEl.textContent = title;
    codeEl.textContent = content;

    const badgeEl = document.querySelector(".badge");
    if (badgeEl) {
      badgeEl.textContent = format === "json" ? "JSON Preview" : "Markdown Preview";
    }
  } catch (error) {
    console.error("Failed to load preview data:", error);
    codeEl.textContent = "Error loading content: " + error.message;
  }

  // Copy button logic
  copyBtn.addEventListener("click", async () => {
    if (!content) return;
    copyBtn.disabled = true;
    const originalText = copyBtn.innerHTML;

    try {
      await navigator.clipboard.writeText(content);
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" class="icon"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        Copied!
      `;
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.disabled = false;
      }, 2000);
    } catch (e) {
      console.error(e);
      copyBtn.textContent = "Copy Failed";
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.disabled = false;
      }, 2000);
    }
  });

  // Download button logic
  downloadBtn.addEventListener("click", () => {
    if (!content) return;

    const ext = format === "json" ? "json" : "md";
    const mimeType = format === "json" ? "application/json" : "text/markdown";
    const sanitizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    const filename = `${sanitizedTitle || "chat-export"}.${ext}`;

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});
