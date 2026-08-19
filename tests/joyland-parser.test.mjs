import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('JoylandParser correctly matches URL and extracts conversation', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/joyland-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  // Expose browser globals
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;
  window.location = { href: 'https://www.joyland.ai/chat/12345' };

  const { JoylandParser } = await import('decant-core');
  const parser = new JoylandParser();

  assert.equal(parser.isAvailable('https://www.joyland.ai/chat/12345'), true);
  assert.equal(parser.isAvailable('https://joyland.ai/chat/12345'), true);
  assert.equal(parser.isAvailable('https://chatgpt.com/'), false);

  const result = await parser.parse();
  assert.equal(result.title, 'nicebot - Joyland Chat');
  assert.equal(result.metadata.Source, 'Joyland');
  assert.equal(result.metadata.Character, 'nicebot');
  assert.equal(result.metadata.Creator, 'Sai Kalyan');
  assert.equal(result.messages.length, 15);

  assert.equal(result.messages[0].role, 'Joyland');
  assert.equal(result.messages[0].content, "It's a bit chilly, isn't it ?");

  assert.equal(result.messages[1].role, 'User');
  assert.match(result.messages[1].content, /Yes, it seems a bit cooler than usual today/);

  assert.equal(result.messages[2].role, 'Joyland');
  assert.match(result.messages[2].content, /\*grins mischievously\*/);

  assert.equal(result.messages[14].role, 'Joyland');
  assert.match(result.messages[14].content, /Now we're talking!/);
});
