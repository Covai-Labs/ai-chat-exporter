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
  const copyableFormatsMatch = popupJs.match(
    /copyableFormats\s*=\s*new Set\(\[([\s\S]*?)\]\)/,
  );

  assert.ok(copyableFormatsMatch, "copyableFormats Set should be defined");

  const copyableFormatsSource = copyableFormatsMatch[1];
  assert.match(copyableFormatsSource, /["']markdown["']/);
  assert.match(copyableFormatsSource, /["']json["']/);
  assert.doesNotMatch(copyableFormatsSource, /["']pdf["']/);
});

test("popup includes an open in tab button", () => {
  assert.match(popupHtml, /id="preview-btn"/);
  assert.match(popupHtml, /Open in Tab/);
});

test("preview button triggers local storage and opens preview.html tab", () => {
  assert.match(popupJs, /chrome\.storage\.local\.set/);
  assert.match(popupJs, /url:\s*chrome\.runtime\.getURL\(\s*["']popup\/preview\.html["']\s*\)/);
});
