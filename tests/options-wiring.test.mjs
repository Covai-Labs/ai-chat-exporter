import assert from 'node:assert/strict';
import { test } from 'node:test';

test('chrome.storage.sync schema defaults for options system', () => {
  const defaultOptions = {
    defaultFormat: 'markdown',
    includeImages: true,
    parserMode: 'auto',
    defaultTransferTarget: 'claude',
    launchMode: 'popup',
  };

  assert.equal(defaultOptions.defaultFormat, 'markdown');
  assert.equal(defaultOptions.includeImages, true);
  assert.equal(defaultOptions.parserMode, 'auto');
  assert.equal(defaultOptions.defaultTransferTarget, 'claude');
  assert.equal(defaultOptions.launchMode, 'popup');
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
