(async () => {
  await import(chrome.runtime.getURL('content/main.js'));
})();
