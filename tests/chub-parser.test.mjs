import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('ChubParser correctly matches URL and extracts conversation', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/chub-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  // Expose browser globals
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;
  window.location = { href: 'https://chub.ai/chat/380081' };

  const { ChubParser } = await import('decant-core');
  const parser = new ChubParser();

  assert.equal(parser.isAvailable('https://chub.ai/chat/380081'), true);
  assert.equal(parser.isAvailable('https://www.chub.ai/chat/380081'), true);
  assert.equal(parser.isAvailable('https://characterhub.org/chat/380081'), true);
  assert.equal(parser.isAvailable('https://chatgpt.com/'), false);

  const result = await parser.parse();
  assert.equal(result.title, 'A private chat with Haena');
  assert.equal(result.metadata.Source, 'Chub');
  assert.equal(result.metadata.Character, 'Haena');
  assert.equal(result.metadata.User, 'serene_interaction_86984');
  assert.equal(result.messages.length, 13);

  assert.equal(result.messages[0].role, 'Chub');
  assert.match(
    result.messages[0].content,
    /Haena and serene.*are sitting together on a park bench/,
  );
  assert.match(result.messages[0].content, /Oh, my sweet boy, you're looking so adorable today/);

  assert.equal(result.messages[1].role, 'User');
  assert.equal(result.messages[1].content, 'yes, i am fine, thank you');

  assert.equal(result.messages[2].role, 'Chub');
  assert.match(result.messages[2].content, /Got it\. Fine\. Like I'd really believe that/);

  assert.equal(result.messages[12].role, 'Chub');
  assert.match(result.messages[12].content, /Alright\? That's all I get\?/);
});
