import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifestJson = fs.readFileSync('manifest.json', 'utf8');
const buildPy = fs.readFileSync('build.py', 'utf8');
const backgroundJs = fs.readFileSync('background/background.js', 'utf8');
const sidepanelHtml = fs.readFileSync('sidepanel/sidepanel.html', 'utf8');
const sidepanelJs = fs.readFileSync('sidepanel/sidepanel.js', 'utf8');
const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
const popupJs = fs.readFileSync('popup/popup.js', 'utf8');

test('manifest.json declares sidePanel permission and side_panel default_path', () => {
  const manifest = JSON.parse(manifestJson);
  assert.ok(
    manifest.permissions.includes('sidePanel'),
    'manifest permissions should include sidePanel',
  );
  assert.equal(manifest.side_panel?.default_path, 'sidepanel/sidepanel.html');
});

test('build.py strips sidePanel and side_panel for firefox target', () => {
  assert.match(buildPy, /if target == ['"]firefox['"]/);
  assert.match(buildPy, /sidePanel/);
  assert.match(buildPy, /del manifest\['side_panel'\]/);
});

test('background.js syncs side panel behavior and handles OPEN_SIDE_PANEL', () => {
  assert.match(backgroundJs, /syncSidePanelBehavior/);
  assert.match(backgroundJs, /setPanelBehavior/);
  assert.match(backgroundJs, /action === ['"]OPEN_SIDE_PANEL['"]/);
});

test('sidepanel.html includes export, preview, and settings tabs', () => {
  assert.match(sidepanelHtml, /data-tab="export-tab"/);
  assert.match(sidepanelHtml, /data-tab="preview-tab"/);
  assert.match(sidepanelHtml, /data-tab="settings-tab"/);
  assert.match(sidepanelHtml, /name="launch-mode"/);
});

test('sidepanel.js synchronizes launch mode preferences with chrome.storage.sync', () => {
  assert.match(sidepanelJs, /chrome\.storage\.sync\.get\(['"]launchMode['"]\)/);
  assert.match(sidepanelJs, /chrome\.storage\.sync\.set\(\{\s*launchMode:/);
});

test('popup.html and popup.js provide button to trigger side panel', () => {
  assert.match(popupHtml, /id="open-sidepanel-btn"/);
  assert.match(popupJs, /chrome\.sidePanel\.open/);
});
