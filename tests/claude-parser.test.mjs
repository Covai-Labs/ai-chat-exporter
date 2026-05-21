import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('ClaudeParser extracts standard messages and Claude Artifacts', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/claude-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  // Expose browser globals
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  // Mock chrome extension global
  global.chrome = {
    runtime: {
      getURL: (path) => path,
    },
  };

  // Mock window.location
  window.location = { origin: 'https://claude.ai', href: 'https://claude.ai/chat/123' };

  // Mock window.postMessage using linkedom's built-in dispatchEvent system
  window.postMessage = (msg) => {
    if (msg && msg.type === 'ReqAtftInfo') {
      setTimeout(() => {
        const event = new window.Event('message');
        event.data = {
          type: 'RspAtftInfo',
          idx: msg.idx,
          atftInfo: {
            title: 'hello-world.js',
            content: 'console.log("Hello, World!");',
            language: 'javascript',
          },
        };
        window.dispatchEvent(event);
      }, 5);
    }
  };

  // Append a mock artifact element to test artifact extraction next to response
  const responseEl = document.querySelector('.font-claude-response');
  const artifactEl = document.createElement('div');
  artifactEl.className = 'artifact-block-cell';
  responseEl.parentNode.appendChild(artifactEl);

  const { ClaudeParser } = await import('../content/parsers/claude.js');
  const parser = new ClaudeParser();

  const result = await parser.parse();

  assert.equal(result.messages.length, 3);
  assert.equal(result.messages[0].role, 'User');
  assert.match(result.messages[0].content, /Please write a short response/);

  assert.equal(result.messages[1].role, 'Claude');
  assert.match(result.messages[1].content, /Here is a short response/);

  assert.equal(result.messages[2].role, 'Claude Artifact');
  assert.match(result.messages[2].content, /Artifact: hello-world.js/);
  assert.match(result.messages[2].content, /console.log/);
});
