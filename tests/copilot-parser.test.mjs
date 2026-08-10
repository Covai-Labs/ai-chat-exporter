import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const html = fs.readFileSync(path.join(__dirname, 'fixtures/copilot.html'), 'utf8');
const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

global.window = window;
global.document = document;
global.HTMLElement = HTMLElement;
global.Node = Node;
global.DOMParser = DOMParser;

test('CopilotParser detects copilot.microsoft.com, copilot.com, and bing.com/chat URLs', async () => {
  const { CopilotParser } = await import('../content/parsers/copilot.js');
  const parser = new CopilotParser();

  assert.equal(parser.isAvailable('https://copilot.microsoft.com/'), true);
  assert.equal(parser.isAvailable('https://copilot.microsoft.com/chats/12345'), true);
  assert.equal(
    parser.isAvailable(
      'https://copilot.com/chat?fromcode=cmmj8t0ivkm&sessionId=d0e6eaba-da1e-c759-44d9-b9da8d3c41f7',
    ),
    true,
  );
  assert.equal(parser.isAvailable('https://www.copilot.com/chat'), true);
  assert.equal(parser.isAvailable('https://www.bing.com/chat'), true);
  assert.equal(parser.isAvailable('https://chatgpt.com/'), false);
});

test('CopilotParser correctly parses chat content from fixture', async () => {
  window.location = { href: 'https://copilot.microsoft.com/chats/fixture' };

  const { CopilotParser } = await import('../content/parsers/copilot.js');
  const parser = new CopilotParser();

  const result = await parser.parse();
  console.error('DEBUG MESSAGES:', JSON.stringify(result.messages));

  assert.equal(result.title, 'Global Work and Wage Comparison');
  assert.equal(result.messages.length, 2);

  // User message check
  assert.equal(result.messages[0].role, 'User');
  assert.ok(result.messages[0].content.includes('comparing Denmark, Sweden, and USA work hours'));

  // Copilot message check
  assert.equal(result.messages[1].role, 'Copilot');
  assert.ok(result.messages[1].content.includes('**bold findings**'));
  assert.ok(result.messages[1].content.includes('*key details*'));
  assert.ok(result.messages[1].content.includes('[deadrat.in](https://deadrat.in)'));

  // Code block check
  assert.ok(result.messages[1].content.includes('```elixir'));
  assert.ok(result.messages[1].content.includes('IO.puts "Hello, world!"'));

  // Table check
  assert.ok(result.messages[1].content.includes('| Country | Median Wages |'));
  assert.ok(result.messages[1].content.includes('| Denmark | ~$3,500 | 37 |'));

  // Noise check: ensure button text like "Copy" or "Like" is stripped
  assert.equal(result.messages[1].content.includes('Copy'), false);
  assert.equal(result.messages[1].content.includes('Like'), false);
});
