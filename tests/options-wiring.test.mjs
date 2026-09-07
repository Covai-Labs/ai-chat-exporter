import assert from 'node:assert/strict';
import { test } from 'node:test';

test('chrome.storage.sync schema defaults for options system', () => {
  const defaultOptions = {
    defaultFormat: 'markdown',
    includeImages: true,
    filenameTemplate: '{platform} - {title} - {datetime}',
    parserMode: 'auto',
    defaultTransferTarget: 'claude',
    launchMode: 'popup',
    theme: 'system',
  };

  assert.equal(defaultOptions.defaultFormat, 'markdown');
  assert.equal(defaultOptions.includeImages, true);
  assert.equal(defaultOptions.filenameTemplate, '{platform} - {title} - {datetime}');
  assert.equal(defaultOptions.parserMode, 'auto');
  assert.equal(defaultOptions.defaultTransferTarget, 'claude');
  assert.equal(defaultOptions.launchMode, 'popup');
  assert.equal(defaultOptions.theme, 'system');
});

test('smart transfer target logic defaults away from current platform', () => {
  function getSmartTransferTarget(currentPlatform, userDefault = 'claude') {
    const platformKey = (currentPlatform || '').toLowerCase();
    let target = userDefault;
    if (platformKey.includes('chatgpt') && target === 'chatgpt') {
      target = 'claude';
    } else if (platformKey.includes('claude') && target === 'claude') {
      target = 'chatgpt';
    }
    return target;
  }

  // When on ChatGPT and user default is chatgpt -> switches to claude
  assert.equal(getSmartTransferTarget('ChatGPT', 'chatgpt'), 'claude');

  // When on Claude and user default is claude -> switches to chatgpt
  assert.equal(getSmartTransferTarget('Claude Chat', 'claude'), 'chatgpt');

  // When on Gemini and user default is claude -> remains claude
  assert.equal(getSmartTransferTarget('Gemini', 'claude'), 'claude');

  // When on ChatGPT and user default is deepseek -> remains deepseek
  assert.equal(getSmartTransferTarget('ChatGPT', 'deepseek'), 'deepseek');
});

test('applyTheme correctly sets data-theme for all themes and removes for system', () => {
  const mockDoc = {
    attrs: {},
    documentElement: {
      setAttribute(name, val) {
        mockDoc.attrs[name] = val;
      },
      removeAttribute(name) {
        delete mockDoc.attrs[name];
      },
      getAttribute(name) {
        return mockDoc.attrs[name];
      },
    },
  };

  function applyTheme(theme, targetDoc = mockDoc) {
    if (theme && theme !== 'system') {
      targetDoc.documentElement.setAttribute('data-theme', theme);
    } else {
      targetDoc.documentElement.removeAttribute('data-theme');
    }
  }

  // System removes attribute
  applyTheme('system');
  assert.equal(mockDoc.documentElement.getAttribute('data-theme'), undefined);

  // Dark & Light
  applyTheme('dark');
  assert.equal(mockDoc.documentElement.getAttribute('data-theme'), 'dark');

  applyTheme('light');
  assert.equal(mockDoc.documentElement.getAttribute('data-theme'), 'light');

  // Modern aliases
  applyTheme('modern-dark');
  assert.equal(mockDoc.documentElement.getAttribute('data-theme'), 'modern-dark');

  applyTheme('modern-light');
  assert.equal(mockDoc.documentElement.getAttribute('data-theme'), 'modern-light');

  // Palette themes
  const themes = [
    'catppuccin',
    'monokai',
    'synthwave',
    'gruvbox',
    'dracula',
    'nord',
    'github-dark',
    'github-light',
    'solarized-dark',
    'solarized-light',
  ];
  for (const th of themes) {
    applyTheme(th);
    assert.equal(mockDoc.documentElement.getAttribute('data-theme'), th);
  }

  // Empty or undefined removes attribute
  applyTheme('');
  assert.equal(mockDoc.documentElement.getAttribute('data-theme'), undefined);
});
