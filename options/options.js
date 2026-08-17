import { initI18n, applyI18n, t } from '../content/utils/i18n.js';

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
  if (window.self !== window.top) {
    document.documentElement.classList.add('in-iframe');
  }

  // Initialize localization
  await initI18n();
  applyI18n();

  const themeSelect = document.getElementById('theme-select');
  const languageSelect = document.getElementById('language-select');
  const defaultFormatSelect = document.getElementById('default-format-select');
  const defaultIncludeImages = document.getElementById('default-include-images');
  const parserModeSelect = document.getElementById('parser-mode-select');
  const defaultTransferSelect = document.getElementById('default-transfer-select');
  const launchModeSection = document.getElementById('launch-mode-section');
  const launchModeRadios = document.querySelectorAll('input[name="launch-mode"]');
  const toast = document.getElementById('toast');

  let toastTimer = null;
  function showToast(message) {
    const toastMsg = message || t('toastSaved') || 'Preferences saved!';
    toast.textContent = toastMsg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2000);
  }

  const isFirefox = typeof browser !== 'undefined' || !chrome.sidePanel;
  if (isFirefox && launchModeSection) {
    launchModeSection.classList.add('hidden');
  }

  const obsidianVaultInput = document.getElementById('obsidian-vault-input');

  const stored = await chrome.storage.sync.get([
    'theme',
    'uiLanguage',
    'defaultFormat',
    'includeImages',
    'parserMode',
    'defaultTransferTarget',
    'obsidianVaultName',
    'launchMode',
  ]);

  const activeTheme = stored.theme || 'system';
  if (themeSelect) themeSelect.value = activeTheme;
  applyTheme(activeTheme);

  const activeLanguage = stored.uiLanguage || 'auto';
  if (languageSelect) languageSelect.value = activeLanguage;

  if (stored.defaultFormat) defaultFormatSelect.value = stored.defaultFormat;
  if (stored.includeImages !== undefined) defaultIncludeImages.checked = stored.includeImages;
  if (stored.parserMode) parserModeSelect.value = stored.parserMode;
  if (stored.defaultTransferTarget) defaultTransferSelect.value = stored.defaultTransferTarget;
  if (stored.obsidianVaultName && obsidianVaultInput)
    obsidianVaultInput.value = stored.obsidianVaultName;
  if (stored.launchMode && !isFirefox) {
    const radio = document.querySelector(`input[name="launch-mode"][value="${stored.launchMode}"]`);
    if (radio) radio.checked = true;
  }

  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const selectedTheme = themeSelect.value;
      chrome.storage.sync.set({ theme: selectedTheme });
      applyTheme(selectedTheme);
      showToast();
    });
  }

  if (languageSelect) {
    languageSelect.addEventListener('change', async () => {
      const selectedLang = languageSelect.value;
      await chrome.storage.sync.set({ uiLanguage: selectedLang });
      await initI18n(selectedLang);
      applyI18n();
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

  if (obsidianVaultInput) {
    obsidianVaultInput.addEventListener('change', () => {
      chrome.storage.sync.set({ obsidianVaultName: obsidianVaultInput.value.trim() });
      showToast();
    });
  }

  launchModeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked && !isFirefox) {
        chrome.storage.sync.set({ launchMode: radio.value });
        showToast();
      }
    });
  });

  const chromeShortcutsAction = document.getElementById('chrome-shortcuts-action');
  const firefoxShortcutsAction = document.getElementById('firefox-shortcuts-action');
  const configureShortcutsBtn = document.getElementById('configure-shortcuts-btn');
  const copyAboutAddonsBtn = document.getElementById('copy-about-addons-btn');

  if (isFirefox) {
    if (chromeShortcutsAction) chromeShortcutsAction.classList.add('hidden');
    if (firefoxShortcutsAction) firefoxShortcutsAction.classList.remove('hidden');
  } else {
    if (chromeShortcutsAction) chromeShortcutsAction.classList.remove('hidden');
    if (firefoxShortcutsAction) firefoxShortcutsAction.classList.add('hidden');
  }

  if (configureShortcutsBtn) {
    configureShortcutsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      }
    });
  }

  if (copyAboutAddonsBtn) {
    copyAboutAddonsBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText('about:addons');
        }
        showToast(t('copiedAboutAddons') || 'Copied!');
      } catch {
        showToast('about:addons');
      }
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
      if (areaName === 'sync') {
        if (changes.theme) {
          const newTheme = changes.theme.newValue || 'system';
          if (themeSelect) themeSelect.value = newTheme;
          applyTheme(newTheme);
        }
        if (changes.uiLanguage) {
          const newLang = changes.uiLanguage.newValue || 'auto';
          if (languageSelect) languageSelect.value = newLang;
          await initI18n(newLang);
          applyI18n();
        }
      }
    });
  }
});
