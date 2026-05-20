const fs = require("node:fs");
const test = require("node:test");
const assert = require("node:assert/strict");

const popupHtml = fs.readFileSync("popup/popup.html", "utf8");
const popupJs = fs.readFileSync("popup/popup.js", "utf8");

test("popup includes a copy button next to export", () => {
  assert.match(popupHtml, /id="copy-btn"/);
  assert.match(popupHtml, /Copy to Clipboard/);
});

test("popup sends a COPY_CHAT message for clipboard actions", () => {
  assert.match(popupJs, /action:\s*"COPY_CHAT"/);
});

test("copy button is enabled for markdown and json formats only", () => {
  assert.match(
    popupJs,
    /copyableFormats\s*=\s*new Set\(\["markdown", "json"\]\)/,
  );
  assert.doesNotMatch(popupJs, /copyableFormats\s*=\s*new Set\([^)]*"pdf"/);
});
