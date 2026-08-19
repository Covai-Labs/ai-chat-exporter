import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('PerplexityParser correctly parses chat content from fixture', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/perplexity-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  window.location = { href: 'https://www.perplexity.ai/' };

  const { PerplexityParser } = await import('decant-core');
  const parser = new PerplexityParser();

  const result = await parser.parse();

  assert.equal(
    result.title,
    "Please write a short response that includes: 1. A paragraph containing **bold text**, *italic text*, and a link to deadrat.in. 2. A code block in Elixir showing a hello world. 3. A simple table of a few countries (maybe denmark, sweden, USA, India, Pakistan, Nigeria) showing: median wages, average work hours per week, paid leave days, and union membership rate. 4. A math equation using LaTeX, maybe Euler's Identity.",
  );
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.equal(result.messages[1].role, 'Perplexity');
});
