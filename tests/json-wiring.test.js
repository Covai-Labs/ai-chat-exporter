import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const mainJs = fs.readFileSync('content/main.js', 'utf8');
const popupHtml = fs.readFileSync('popup/popup.html', 'utf8');
const manifestJson = fs.readFileSync('manifest.json', 'utf8');
const buildSh = fs.readFileSync('build.sh', 'utf8');

test('content script registers the JSON formatter', () => {
  assert.match(mainJs, /import \{ JsonFormatter \} from '\.\/formatters\/json\.js';/);
  assert.match(mainJs, /json: new JsonFormatter\(/);
});

test('popup enables JSON exports', () => {
  assert.match(popupHtml, /<option value="json">JSON \(\.json\)<\/option>/);
  assert.doesNotMatch(popupHtml, /<option value="json" disabled>/);
});

test('build includes the JSON schema files', () => {
  assert.match(manifestJson, /"schemas\/\*\.json"/);
  assert.match(buildSh, /cp -r background content docs\/icons popup schemas dist\//);
});
