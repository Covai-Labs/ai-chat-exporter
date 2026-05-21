import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set up Linkedom DOM context for Turndown at top-level
const { window, document, HTMLElement, Node, DOMParser } = parseHTML('<div></div>');
global.window = window;
global.document = document;
global.HTMLElement = HTMLElement;
global.Node = Node;
global.DOMParser = DOMParser;

// Import ChatGPTParser after globals are set so Turndown loads correctly
const { ChatGPTParser } = await import('../content/parsers/chatgpt.js');

test('extractMessage combines multiple assistant blocks in one ChatGPT turn', () => {
  const parser = new ChatGPTParser();
  parser.convertContentElement = (element) => element.textContent;

  const { document: testDoc } = parseHTML(`
    <div data-testid="conversation-turn-22">
      <div data-message-author-role="assistant">
        <div class="markdown">I will inspect the provided documents first.</div>
      </div>
      <div data-message-author-role="assistant">
        <div class="markdown">Final answer content after thinking mode.</div>
      </div>
    </div>
  `);

  const turn = testDoc.querySelector('[data-testid="conversation-turn-22"]');
  const message = parser.extractMessage(turn);

  assert.equal(message.role, 'ChatGPT');
  assert.equal(
    message.content,
    'I will inspect the provided documents first.\n\n' +
      'Final answer content after thinking mode.',
  );
});

test('ChatGPTParser correctly parses chat content from real HTML fixture', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/chatgpt-chat.html'), 'utf8');
  const { window: chatWindow, document: chatDocument } = parseHTML(html);

  // Backup global window/document context
  const oldWindow = global.window;
  const oldDocument = global.document;

  // Switch to the fixture context
  global.window = chatWindow;
  global.document = chatDocument;

  chatWindow.location = { href: 'https://chatgpt.com/c/123' };
  chatWindow.HTMLElement.prototype.scrollIntoView = function () {};

  try {
    const parser = new ChatGPTParser();
    const result = await parser.parse();

    assert.equal(result.title, 'ChatGPT Session');
    assert.equal(result.messages.length, 2);
    assert.equal(result.messages[0].role, 'User');
    assert.match(result.messages[0].content, /Please write a short response/);

    assert.equal(result.messages[1].role, 'ChatGPT');
    assert.match(result.messages[1].content, /Here is a short example response/);
    assert.match(result.messages[1].content, /defmodule Hello do/); // elixir code block
    assert.match(result.messages[1].content, /\| Country \| Median Monthly Wage/); // GFM table
  } finally {
    // Restore original context
    global.window = oldWindow;
    global.document = oldDocument;
  }
});
