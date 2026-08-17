import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseHTML } from 'linkedom';

test('manifest.json defines commands for copy_markdown, download_markdown, and open_preview', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

  assert.ok(manifest.commands, 'manifest.json should have a commands property');
  assert.ok(manifest.commands.copy_markdown, 'commands should have copy_markdown');
  assert.ok(manifest.commands.download_markdown, 'commands should have download_markdown');
  assert.ok(manifest.commands.open_preview, 'commands should have open_preview');

  // Verify suggested keys
  assert.equal(manifest.commands.copy_markdown.suggested_key.default, 'Alt+Shift+C');
  assert.equal(manifest.commands.download_markdown.suggested_key.default, 'Alt+Shift+D');
  assert.equal(manifest.commands.open_preview.suggested_key.default, 'Alt+Shift+P');

  // Verify description placeholders
  assert.match(manifest.commands.copy_markdown.description, /__MSG_commandCopyMarkdown__/);
  assert.match(manifest.commands.download_markdown.description, /__MSG_commandDownloadMarkdown__/);
  assert.match(manifest.commands.open_preview.description, /__MSG_commandOpenPreview__/);
});

test('wxt.config.ts defines commands configuration matching manifest', () => {
  const wxtConfig = fs.readFileSync('wxt.config.ts', 'utf8');

  assert.match(wxtConfig, /commands:\s*{/);
  assert.match(wxtConfig, /copy_markdown:/);
  assert.match(wxtConfig, /download_markdown:/);
  assert.match(wxtConfig, /open_preview:/);
  assert.match(wxtConfig, /Alt\+Shift\+C/);
  assert.match(wxtConfig, /Alt\+Shift\+D/);
  assert.match(wxtConfig, /Alt\+Shift\+P/);
});

test('options UI includes Keyboard Shortcuts section and elements', () => {
  const optionsHtml = fs.readFileSync('options/options.html', 'utf8');
  const entrypointsOptionsHtml = fs.readFileSync('entrypoints/options/index.html', 'utf8');

  for (const html of [optionsHtml, entrypointsOptionsHtml]) {
    const { document } = parseHTML(html);

    const shortcutsSection = document.getElementById('shortcuts-section');
    assert.ok(shortcutsSection, 'shortcuts-section should exist in options page');

    const configBtn = document.getElementById('configure-shortcuts-btn');
    assert.ok(configBtn, 'configure-shortcuts-btn should exist');

    const copyAboutAddonsBtn = document.getElementById('copy-about-addons-btn');
    assert.ok(copyAboutAddonsBtn, 'copy-about-addons-btn should exist');

    const keys = Array.from(document.querySelectorAll('.key')).map((k) => k.textContent.trim());
    assert.ok(keys.includes('Alt'));
    assert.ok(keys.includes('Shift'));
    assert.ok(keys.includes('C'));
    assert.ok(keys.includes('D'));
    assert.ok(keys.includes('P'));
  }
});

test('background.js contains chrome.commands listener and handler', () => {
  const bgContent = fs.readFileSync('background/background.js', 'utf8');
  const entryBgContent = fs.readFileSync('entrypoints/background.js', 'utf8');

  for (const content of [bgContent, entryBgContent]) {
    assert.match(content, /chrome\.commands\.onCommand\.addListener/);
    assert.match(content, /handleCommand/);
    assert.match(content, /copy_markdown/);
    assert.match(content, /download_markdown/);
    assert.match(content, /open_preview/);
  }
});

test('content.js handles EXECUTE_SHORTCUT and shows toast feedback', () => {
  const contentScript = fs.readFileSync('content/main.js', 'utf8');
  const entryContentScript = fs.readFileSync('entrypoints/content.js', 'utf8');

  for (const content of [contentScript, entryContentScript]) {
    assert.match(content, /EXECUTE_SHORTCUT/);
    assert.match(content, /showExporterToast/);
    assert.match(content, /copyToClipboard/);
    assert.match(content, /copy_markdown/);
    assert.match(content, /download_markdown/);
  }
});
