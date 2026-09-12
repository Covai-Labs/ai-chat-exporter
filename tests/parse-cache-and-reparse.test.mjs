import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('popup.html and entrypoints/popup/index.html include reparse button and status structure', () => {
  const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
  const indexHtml = fs.readFileSync('entrypoints/popup/index.html', 'utf8');

  for (const html of [popupHtml, indexHtml]) {
    assert.match(html, /id="reparse-btn"/, 'Must contain reparse button');
    assert.match(html, /data-i18n-title="reparseChat"/, 'Must have reparseChat i18n title');
    assert.match(html, /class="status-indicator/, 'Must have status indicator');
    assert.match(html, /class="status-text"/, 'Must have status text');
  }
});

test('popup.css contains status states, pulse animation, and spin keyframes', () => {
  const popupCss = fs.readFileSync('popup/popup.css', 'utf8');
  const entryCss = fs.readFileSync('entrypoints/popup/popup.css', 'utf8');

  for (const css of [popupCss, entryCss]) {
    assert.match(css, /@keyframes pulse-dot/);
    assert.match(css, /@keyframes spin-btn/);
    assert.match(css, /\.status\.status-connecting/);
    assert.match(css, /\.status\.status-scanning/);
    assert.match(css, /\.status\.status-ready/);
    assert.match(css, /\.sidepanel-icon-btn\.spin/);
  }
});

test('popup.js wires reparse-btn and establishes tab session port', () => {
  const popupJs = fs.readFileSync('popup/popup.js', 'utf8');
  const entryPopupJs = fs.readFileSync('entrypoints/popup/popup.js', 'utf8');

  for (const js of [popupJs, entryPopupJs]) {
    assert.match(js, /getElementById\(['"]reparse-btn['"]\)/);
    assert.match(js, /reparseBtn\.addEventListener\(['"]click['"]/);
    assert.match(js, /checkAvailability\(\{\s*force:\s*true\s*\}\)/);
    assert.match(js, /popup-tab-session/);
    assert.match(js, /setStatus\(/);
  }
});

test('content script implements 90s parse cache, DOM mutation observer, and toast notification', () => {
  const mainJs = fs.readFileSync('content/main.js', 'utf8');
  const entryContentJs = fs.readFileSync('entrypoints/content.js', 'utf8');

  for (const js of [mainJs, entryContentJs]) {
    assert.match(js, /PARSE_CACHE_TTL_MS\s*=\s*90\s*\*\s*1000/);
    assert.match(js, /isCacheValid/);
    assert.match(js, /setupDomObserver/);
    assert.match(js, /MutationObserver/);
    assert.match(js, /popup-tab-session/);
    assert.match(js, /showExporterToast/);
    assert.match(js, /request\.action === ['"]CLEAR_CACHE['"]/);
    assert.match(js, /request\.action === ['"]SHOW_TOAST['"]/);
  }
});

test('parse cache logic behaves correctly with TTL, dirty flag, and force bypass', () => {
  const PARSE_CACHE_TTL_MS = 90 * 1000;
  let parseCache = null;

  function isCacheValid(url, mode, force = false) {
    if (force || !parseCache || parseCache.dirty || !parseCache.report) return false;
    if (parseCache.url !== url) return false;
    if (mode && parseCache.parserMode && parseCache.parserMode !== mode) return false;
    return Date.now() - parseCache.timestamp < PARSE_CACHE_TTL_MS;
  }

  const url = 'https://chatgpt.com/c/test-chat-id';

  // 1. Initial state: cache is invalid
  assert.equal(isCacheValid(url, 'auto'), false);

  // 2. Populate cache
  parseCache = {
    url,
    timestamp: Date.now(),
    parserMode: 'auto',
    report: { available: true, platform: 'ChatGPT', count: 10 },
    dirty: false,
  };

  // 3. Cache hit
  assert.equal(isCacheValid(url, 'auto'), true);

  // 4. Force bypass
  assert.equal(isCacheValid(url, 'auto', true), false);

  // 5. URL mismatch
  assert.equal(isCacheValid('https://chatgpt.com/c/different-chat', 'auto'), false);

  // 6. Mode mismatch
  assert.equal(isCacheValid(url, 'dom'), false);

  // 7. DOM mutation marked dirty
  parseCache.dirty = true;
  assert.equal(isCacheValid(url, 'auto'), false);

  // 8. Expired TTL
  parseCache.dirty = false;
  parseCache.timestamp = Date.now() - 95000;
  assert.equal(isCacheValid(url, 'auto'), false);
});
