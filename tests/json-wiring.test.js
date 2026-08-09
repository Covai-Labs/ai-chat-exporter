import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const mainJs = fs.readFileSync('content/main.js', 'utf8');
const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
const wxtConfig = fs.readFileSync('wxt.config.ts', 'utf8');

test('content script registers the JSON formatter', () => {
  assert.match(mainJs, /import \{ JsonFormatter \} from '\.\/formatters\/json\.js';/);
  assert.match(mainJs, /json: new JsonFormatter\(/);
});

test('popup enables JSON exports', () => {
  assert.match(popupHtml, /<option value="json">.*JSON \(\.json\)<\/option>/);
  assert.doesNotMatch(popupHtml, /<option value="json" disabled>/);
});

test('build includes the JSON schema files', () => {
  assert.match(wxtConfig, /'schemas\/\*'/);
  assert.ok(fs.existsSync('public/schemas/export-v1.schema.json'));
});
