import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('GoogleAIStudioParser correctly extracts user and assistant messages from fixture', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/google-ai-studio-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  const { GoogleAIStudioParser } = await import('decant-core');
  const parser = new GoogleAIStudioParser();

  assert.equal(parser.isAvailable('https://aistudio.google.com/app/prompts/new_chat'), true);

  const result = await parser.parse();
  assert.equal(result.title, 'My AI Studio System Prompt');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.match(result.messages[0].content, /Write a Python function/);
  assert.equal(result.messages[1].role, 'Google AI Studio');
  assert.match(result.messages[1].content, /def fib\(n\):/);
});
