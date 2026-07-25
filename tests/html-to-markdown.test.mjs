import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Set up Linkedom DOM context for Turndown at top-level
const { window, document, HTMLElement, Node, DOMParser } = parseHTML('<div></div>');
global.window = window;
global.document = document;
global.HTMLElement = HTMLElement;
global.Node = Node;
global.DOMParser = DOMParser;

// Dynamically import the converter at top-level after setting globals
const { convertToMarkdown, cleanMarkdown } = await import('../content/utils/html-to-markdown.js');

test('converts basic inline elements correctly', () => {
  const el = document.createElement('div');
  el.innerHTML =
    '<p>This is <strong>strong</strong> and <em>emphasis</em> and a <a href="https://example.com">link</a>.</p>';
  const md = convertToMarkdown(el);
  assert.equal(md, 'This is **strong** and *emphasis* and a [link](https://example.com).');
});

test('strips noise buttons, SVGs, and icon containers', () => {
  const el = document.createElement('div');
  el.innerHTML =
    '<p>Hello World</p><button class="copy-button">Copy</button><svg><path d="M0 0h24v24H0z"/></svg>';
  const md = convertToMarkdown(el);
  assert.equal(md, 'Hello World');
});

test('translates HTML tables into standard GFM tables', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Language</th><th>Rating</th></tr>
      </thead>
      <tbody>
        <tr><td>JavaScript</td><td>Good</td></tr>
        <tr><td>Python</td><td>Great</td></tr>
      </tbody>
    </table>
  `;
  const md = convertToMarkdown(el);
  assert.ok(md.includes('| Language | Rating |'));
  assert.ok(md.includes('| --- | --- |'));
  assert.ok(md.includes('| JavaScript | Good |'));
  assert.ok(md.includes('| Python | Great |'));
});

test('cleanMarkdown utility collapses consecutive blank lines and strips trailing space', () => {
  const rawMarkdown = 'Paragraph 1   \n\n\n\n\nParagraph 2\n\n-----   ';
  const cleaned = cleanMarkdown(rawMarkdown);
  assert.equal(cleaned, 'Paragraph 1\n\nParagraph 2\n\n* * *');
});

test('converts wrapped code blocks and preserves line breaks', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <pre class="outer-wrapper">
      <div class="header">
        <svg>icon</svg>elixir
      </div>
      <pre class="inner-pre">
        <code><span>defmodule Hello do</span><br><span>  def world do</span><br><span>    IO.puts("Hello")</span><br><span>  end</span><br><span>end</span></code>
      </pre>
    </pre>
  `;
  const md = convertToMarkdown(el);
  assert.equal(
    md,
    '```elixir\ndefmodule Hello do\n  def world do\n    IO.puts("Hello")\n  end\nend\n```',
  );
});

test('preserves button-wrapped image carousels and converts to markdown image syntax', () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="no-scrollbar flex overflow-auto">
      <div class="group/search-image">
        <button type="button" aria-label="Open image details for Bonobo evidence suggests ancient origin">
          <div>
            <img alt="https://images.openai.com/static-rsc-4/fullsize1.png?purpose=fullsize" src="https://images.openai.com/static-rsc-4/thumb1.png?purpose=inline" />
          </div>
        </button>
      </div>
      <div class="group/search-image">
        <button type="button" aria-label="Open image details for Chimpanzee warfare tactics">
          <div>
            <img alt="https://images.openai.com/static-rsc-4/fullsize2.png?purpose=fullsize" src="https://images.openai.com/static-rsc-4/thumb2.png?purpose=inline" />
          </div>
        </button>
      </div>
    </div>
  `;
  const md = convertToMarkdown(el);
  assert.ok(
    md.includes(
      '![Bonobo evidence suggests ancient origin](https://images.openai.com/static-rsc-4/fullsize1.png?purpose=fullsize)',
    ),
  );
  assert.ok(
    md.includes(
      '![Chimpanzee warfare tactics](https://images.openai.com/static-rsc-4/fullsize2.png?purpose=fullsize)',
    ),
  );
});
