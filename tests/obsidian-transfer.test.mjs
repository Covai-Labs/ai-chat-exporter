import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildObsidianUri, cleanObsidianTitle } from '../content/utils/obsidian.js';

const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
const previewHtml = fs.readFileSync('popup/preview.html', 'utf8');
const optionsHtml = fs.readFileSync('options/options.html', 'utf8');
const optionsJs = fs.readFileSync('options/options.js', 'utf8');
const backgroundJs = fs.readFileSync('background/background.js', 'utf8');

test('cleanObsidianTitle strips invalid filename characters', () => {
  assert.equal(cleanObsidianTitle('My / Chat : Test ? * Title'), 'My  Chat  Test   Title');
  assert.equal(cleanObsidianTitle(''), 'AI Conversation');
});

test('buildObsidianUri formats obsidian://new URI with title, content, and optional vault', () => {
  const uriShort = buildObsidianUri({
    title: 'Research Note',
    content: 'Some markdown content',
    vault: 'Personal Vault',
  });
  assert.ok(uriShort.startsWith('obsidian://new?'));
  assert.ok(uriShort.includes('name=Research+Note'));
  assert.ok(uriShort.includes('vault=Personal+Vault'));
  assert.ok(uriShort.includes('content=Some+markdown+content'));

  const uriNoVault = buildObsidianUri({
    title: 'Basic Note',
    content: 'Hello World',
  });
  assert.ok(!uriNoVault.includes('vault='));
});

test('popup, preview, and options UI include Obsidian option', () => {
  assert.match(popupHtml, /<option value="obsidian">Obsidian<\/option>/);
  assert.match(previewHtml, /<option value="obsidian">Obsidian<\/option>/);
  assert.match(optionsHtml, /<option value="obsidian">Obsidian \(obsidian:\/\/\)<\/option>/);
  assert.match(optionsHtml, /id="obsidian-vault-input"/);
  assert.match(optionsJs, /obsidianVaultName/);
  assert.match(backgroundJs, /target === 'obsidian'/);
});
