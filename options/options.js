function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const themeSelect = document.getElementById('theme-select');
  const defaultFormatSelect = document.getElementById('default-format-select');
  const defaultIncludeImages = document.getElementById('default-include-images');
  const parserModeSelect = document.getElementById('parser-mode-select');
  const defaultTransferSelect = document.getElementById('default-transfer-select');
  const launchModeSection = document.getElementById('launch-mode-section');
  const launchModeRadios = document.querySelectorAll('input[name="launch-mode"]');
  const toast = document.getElementById('toast');

  let toastTimer = null;
  function showToast(message = 'Preferences saved!') {
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2000);
  }

  // Detect Firefox / sidePanel support
  const isFirefox = typeof browser !== 'undefined' || !chrome.sidePanel;
  if (isFirefox && launchModeSection) {
    launchModeSection.classList.add('hidden');
  }

  // Load existing settings from chrome.storage.sync
  const stored = await chrome.storage.sync.get([
    'theme',
    'defaultFormat',
    'includeImages',
    'parserMode',
    'defaultTransferTarget',
    'launchMode',
  ]);

  const activeTheme = stored.theme || 'system';
  if (themeSelect) themeSelect.value = activeTheme;
  applyTheme(activeTheme);

  if (stored.defaultFormat) defaultFormatSelect.value = stored.defaultFormat;
  if (stored.includeImages !== undefined) defaultIncludeImages.checked = stored.includeImages;
  if (stored.parserMode) parserModeSelect.value = stored.parserMode;
  if (stored.defaultTransferTarget) defaultTransferSelect.value = stored.defaultTransferTarget;
  if (stored.launchMode && !isFirefox) {
    const radio = document.querySelector(`input[name="launch-mode"][value="${stored.launchMode}"]`);
    if (radio) radio.checked = true;
  }

  // Auto-save on change
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value;
      chrome.storage.sync.set({ theme: selectedTheme });
      applyTheme(selectedTheme);
      showToast();
    });
  }

  defaultFormatSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ defaultFormat: defaultFormatSelect.value });
    showToast();
  });

  defaultIncludeImages.addEventListener('change', () => {
    chrome.storage.sync.set({ includeImages: defaultIncludeImages.checked });
    showToast();
  });

  parserModeSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ parserMode: parserModeSelect.value });
    showToast();
  });

  defaultTransferSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ defaultTransferTarget: defaultTransferSelect.value });
    showToast();
  });

  launchModeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked && !isFirefox) {
        chrome.storage.sync.set({ launchMode: radio.value });
        showToast();
      }
    });
  });

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.theme) {
        const newTheme = changes.theme.newValue || 'system';
        if (themeSelect) themeSelect.value = newTheme;
        applyTheme(newTheme);
      }
    });
  }
});
