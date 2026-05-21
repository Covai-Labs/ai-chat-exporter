import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('GeminiParser correctly parses chat content from fixture', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/gemini-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  // Expose browser globals for parser and Turndown dependencies
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  // Mock window.location
  window.location = { href: 'https://gemini.google.com/app' };

  const { GeminiParser } = await import('../content/parsers/gemini.js');
  const parser = new GeminiParser();

  const result = await parser.parse();

  assert.equal(result.title, 'Gemini Conversation');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.equal(
    result.messages[0].content,
    'Please write a short response that includes:   \n' +
      ' 1. A paragraph containing **bold text**, *italic text*, and a [link to deadrat.in](https://www.deadrat.in/).   \n' +
      ' 2. A code block in Elixir showing a hello world.   \n' +
      ' 3. A simple table of a few countries (maybe denmark, sweden, USA, India, Pakistan, Nigeria) showing: median wages, average work hours per week, paid leave days, and union membership rate.    \n' +
      " 4. A math equation using LaTeX, maybe Euler's Identity.",
  );
  assert.equal(result.messages[1].role, 'Model');
  assert.equal(
    result.messages[1].content,
    "Here is a concise response combining your requested elements. It features **bold text** to grab your attention, *italic text* for emphasis, and a quick [link to deadrat.in](https://www.deadrat.in/) to fulfill your prompt's requirements.\n\n" +
      '```elixir\n' +
      'IO.puts("Hello, World!")\n' +
      '```\n\n' +
      '| Country | Est. Median Wage (USD/yr) | Avg Work Hours/Week | Min. Paid Leave Days | Est. Union Membership |\n' +
      '| --- | --- | --- | --- | --- |\n' +
      '| Denmark | ~$44,000 | 37 | 25 | ~65% |\n' +
      '| Sweden | ~$42,000 | 40 | 25 | ~68% |\n' +
      '| USA | ~$46,000 | 40 | 0 (Federal) | ~10% |\n' +
      '| India | ~$3,000 | 48 | 15 | ~10% |\n' +
      '| Pakistan | ~$1,500 | 48 | 14 | ~5% |\n' +
      '| Nigeria | ~$1,800 | 40 | 15 | ~12% |\n\n' +
      '> *Note: Wage and union figures are approximate global estimates and can vary based on specific industries and current exchange rates.*\n\n' +
      '$$e^{i\\\\pi} + 1 = 0$$',
  );
});
