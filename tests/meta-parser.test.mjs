import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('MetaParser correctly parses chat content from fixture', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/meta-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  window.location = { href: 'https://meta.ai/' };

  const { MetaParser } = await import('@covai/parser-core');
  const parser = new MetaParser();

  const result = await parser.parse();

  assert.equal(result.title, 'Creating a varied response');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.equal(result.messages[1].role, 'Meta AI');
});
