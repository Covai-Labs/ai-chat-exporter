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

test('ChatGPTParser correctly extracts image carousel images from assistant message turn', () => {
  const parser = new ChatGPTParser();

  const { window: testWin, document: testDoc } = parseHTML(`
    <article data-testid="conversation-turn-5">
      <div data-message-author-role="assistant">
        <div class="markdown prose">
          <div class="no-scrollbar flex overflow-auto">
            <div class="group/search-image">
              <button type="button" aria-label="Open image details for Bonobo social behavior">
                <div>
                  <img alt="https://images.openai.com/static-rsc-4/fullsize_bonobo.png?purpose=fullsize" src="https://images.openai.com/static-rsc-4/inline_bonobo.png?purpose=inline" />
                </div>
              </button>
            </div>
          </div>
          <p>Bonobos are often described as being peaceful.</p>
        </div>
      </div>
    </article>
  `);

  const oldWindow = global.window;
  const oldDocument = global.document;

  global.window = testWin;
  global.document = testDoc;

  try {
    const turn = testDoc.querySelector('article');
    const message = parser.extractMessage(turn);

    assert.equal(message.role, 'ChatGPT');
    assert.match(
      message.content,
      /!\[Bonobo social behavior\]\(https:\/\/images\.openai\.com\/static-rsc-4\/fullsize_bonobo\.png\?purpose=fullsize\)/,
    );
    assert.match(message.content, /Bonobos are often described as being peaceful\./);
  } finally {
    global.window = oldWindow;
    global.document = oldDocument;
  }
});

test('ChatGPTParser correctly extracts API image carousels from content_references', async () => {
  const puaMatch = '\uE200image_group\uE202{"layout":"carousel","query":["bonobo grooming"]}\uE201';
  const sampleMapping = {
    root: { id: 'root', children: ['msg1'] },
    msg1: {
      id: 'msg1',
      children: [],
      message: {
        author: { role: 'assistant' },
        content: { parts: [puaMatch + '\n\nBonobos are social primates.'] },
        metadata: {
          content_references: [
            {
              type: 'image_group',
              matched_text: puaMatch,
              images: [
                {
                  image_result: {
                    title: 'Bonobo Grooming Behavior',
                    content_url:
                      'https://images.openai.com/static-rsc-4/bonobo.jpg?purpose=fullsize',
                  },
                },
              ],
            },
          ],
        },
      },
    },
  };

  const parser = new ChatGPTParser();
  // Mock fetchConversation and token checks
  parser.lastFetch = {
    convId: 'test-123',
    includeImages: true,
    timestamp: Date.now(),
    result: { data: { mapping: sampleMapping, title: 'API Test' }, images: {} },
  };

  // We can pass options with fake token context by mocking or testing cleanMarkdownFromApi indirectly via parse
  // Simple test by invoking parse when lastFetch is set
  global.document = parseHTML(
    '<html><head></head><body><div id="client-bootstrap">{"session":{"accessToken":"fake"}}</div></body></html>',
  ).document;
  global.window = parseHTML('<div></div>').window;
  global.window.location = { pathname: '/c/test-123', href: 'https://chatgpt.com/c/test-123' };

  const result = await parser.parse({ parserMode: 'prefer_api' });

  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].role, 'ChatGPT');
  assert.match(
    result.messages[0].content,
    /!\[Bonobo Grooming Behavior\]\(https:\/\/images\.openai\.com\/static-rsc-4\/bonobo\.jpg\?purpose=fullsize\)/,
  );
  assert.match(result.messages[0].content, /Bonobos are social primates\./);
});
