import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const previewHtml = fs.readFileSync('popup/preview.html', 'utf8');
const previewJs = fs.readFileSync('popup/preview.js', 'utf8');

test('preview page includes a view toggle container and buttons', () => {
  assert.match(previewHtml, /id="view-toggle-container"/);
  assert.match(previewHtml, /id="view-code-btn"/);
  assert.match(previewHtml, /id="view-render-btn"/);
});

test('preview page includes code wrapper and sandboxed render wrapper with iframe', () => {
  assert.match(previewHtml, /id="code-wrapper"/);
  assert.match(previewHtml, /id="render-wrapper"/);
  assert.match(previewHtml, /id="preview-rendered"/);
  assert.match(previewHtml, /sandbox="allow-scripts"/);
});

test('preview script implements view toggling and listener attachment', () => {
  assert.match(previewJs, /viewToggleContainer/);
  assert.match(previewJs, /viewCodeBtn/);
  assert.match(previewJs, /viewRenderBtn/);
  assert.match(previewJs, /codeWrapper/);
  assert.match(previewJs, /renderWrapper/);
  assert.match(previewJs, /previewRendered/);
  assert.match(previewJs, /switchView/);
  assert.match(previewJs, /viewCodeBtn\.addEventListener\('click'/);
  assert.match(previewJs, /viewRenderBtn\.addEventListener\('click'/);
});
