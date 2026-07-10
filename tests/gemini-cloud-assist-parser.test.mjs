import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('GeminiCloudAssistParser correctly parses chat content from fixture', async () => {
  const html = fs.readFileSync(
    path.join(__dirname, 'fixtures/gemini-cloud-assist-chat.html'),
    'utf8',
  );
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  window.location = { href: 'https://console.cloud.google.com/gemini' };

  const { GeminiCloudAssistParser } = await import('../content/parsers/gemini_cloud_assist.js');
  const parser = new GeminiCloudAssistParser();

  const result = await parser.parse();

  assert.equal(result.title, 'I am planning to build an open source web application that lets');

  assert.equal(result.messages.length, 2);

  assert.equal(result.messages[0].role, 'User');
  assert.ok(
    result.messages[0].content.includes('I am planning to build an open source web application'),
  );

  assert.equal(result.messages[1].role, 'Model');
  assert.ok(
    result.messages[1].content.includes(
      'Building a bridge between Google Photos and Wikimedia Commons',
    ),
  );
});
