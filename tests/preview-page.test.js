import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const previewHtml = fs.readFileSync('entrypoints/preview/index.html', 'utf8');
const previewJs = fs.readFileSync('entrypoints/preview/preview.js', 'utf8');

test('preview page includes format tabs and action buttons', () => {
  assert.match(previewHtml, /id="format-tabs"/);
  assert.match(previewHtml, /data-tab="html-render"/);
  assert.match(previewHtml, /data-tab="html-source"/);
  assert.match(previewHtml, /data-tab="markdown"/);
  assert.match(previewHtml, /data-tab="json"/);
  assert.match(previewHtml, /data-tab="doc"/);
  assert.match(previewHtml, /data-tab="png"/);
});

test('preview page includes code wrapper and sandboxed render wrapper with iframe', () => {
  assert.match(previewHtml, /id="code-wrapper"/);
  assert.match(previewHtml, /id="render-wrapper"/);
  assert.match(previewHtml, /id="preview-rendered"/);
  assert.match(previewHtml, /sandbox="allow-scripts allow-modals"/);
});

test('preview script implements multi-format tab switching and listener attachment', () => {
  assert.match(previewJs, /formatTabsContainer/);
  assert.match(previewJs, /codeWrapper/);
  assert.match(previewJs, /renderWrapper/);
  assert.match(previewJs, /previewRendered/);
  assert.match(previewJs, /switchTab/);
  assert.match(previewJs, /formatTabsContainer\.addEventListener\('click'/);
});

test('preview script handles PDF format and autoPrint', () => {
  assert.match(previewHtml, /id="print-btn"/);
  assert.match(previewJs, /initialFormat === 'pdf'/);
  assert.match(previewJs, /printIframe/);
  assert.match(previewJs, /autoPrint/);
});

test('preview page and script handle real PNG rendering and Word .doc MIME type with UTF-8 BOM', () => {
  assert.match(previewJs, /import { ImageFormatter }/);
  assert.match(previewJs, /application\/msword/);
  assert.match(previewJs, /\\ufeff/);
  assert.match(previewJs, /imageFormatter\.format/);
});

test('preview page and script include Transfer Chat option and ContinuationFormatter', () => {
  assert.match(previewHtml, /id="transfer-target-select"/);
  assert.match(previewHtml, /id="transfer-btn"/);
  assert.match(previewJs, /import \{[^}]*ContinuationFormatter[^}]*\}/);
  assert.match(previewJs, /TRANSFER_CHAT/);
});

test('preview page and script handle PNG warning banner, options bar, and autoDownloadPng', () => {
  assert.match(previewHtml, /id="png-warning-banner"/);
  assert.match(previewHtml, /id="png-options-bar"/);
  assert.match(previewHtml, /id="png-quality-checkbox"/);
  assert.match(previewHtml, /id="include-images-checkbox"/);
  assert.match(previewJs, /pngWarningBanner/);
  assert.match(previewJs, /pngOptionsBar/);
  assert.match(previewJs, /autoDownloadPng/);
});

test('preview script dynamically updates download button label based on format tab', () => {
  assert.match(previewJs, /updateDownloadButtonLabel/);
  assert.match(previewJs, /Download PNG/);
  assert.match(previewJs, /Download HTML/);
  assert.match(previewJs, /Download Markdown/);
  assert.match(previewJs, /Download JSON/);
  assert.match(previewJs, /Download Word Doc/);
});
