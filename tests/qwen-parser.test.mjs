import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('QwenParser correctly parses chat content from fixture', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/qwen-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  window.location = { href: 'https://chat.qwen.ai/' };

  const { QwenParser } = await import('../content/parsers/qwen.js');
  const parser = new QwenParser();

  const result = await parser.parse();

  assert.equal(result.title, 'Qwen Chat');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.match(result.messages[0].content, /Please write a short response/);
  assert.equal(result.messages[1].role, 'Qwen');
  assert.match(result.messages[1].content, /Formatting Demo.*Elixir/is);
});
