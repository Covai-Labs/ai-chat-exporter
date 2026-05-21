import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('DeepSeekParser correctly extracts user and assistant messages', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/deepseek-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  // Expose browser globals
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  const { DeepSeekParser } = await import('../content/parsers/deepseek.js');
  const parser = new DeepSeekParser();

  const result = await parser.parse();
  assert.equal(result.title, 'DeepSeek Chat');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.match(result.messages[0].content, /Please write a short response/);
  assert.equal(result.messages[1].role, 'DeepSeek');
  assert.match(result.messages[1].content, /curiosity.*remarkable.*deadrat\.in/);
});
