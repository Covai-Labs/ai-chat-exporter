import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('DeepSeekParser falls back to DOM parsing when API fetch fails or token is missing', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/deepseek-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  // Expose browser globals
  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;
  global.localStorage = { getItem: () => null };
  global.fetch = async () => ({ ok: false, status: 401 });

  const { DeepSeekParser } = await import('../content/parsers/deepseek.js');
  const parser = new DeepSeekParser();

  const result = await parser.parse();
  assert.equal(result.title, 'DeepSeek Chat');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.match(result.messages[0].content, /Please write a short response/);
  assert.equal(result.messages[1].role, 'DeepSeek');
  assert.match(result.messages[1].content, /curiosity.*remarkable.*deadrat\.in/);
});

test('DeepSeekParser extracts conversation via API when token and session ID are present', async () => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures/deepseek-chat.html'), 'utf8');
  const { window, document, HTMLElement, Node, DOMParser } = parseHTML(html);

  global.window = window;
  global.document = document;
  global.HTMLElement = HTMLElement;
  global.Node = Node;
  global.DOMParser = DOMParser;

  window.location = {
    href: 'https://chat.deepseek.com/a/chat/s/12345678-abcd-1234-abcd-1234567890ab',
    pathname: '/a/chat/s/12345678-abcd-1234-abcd-1234567890ab',
  };

  global.localStorage = {
    getItem: (key) => (key === 'userToken' ? JSON.stringify({ value: 'mock-bearer-token' }) : null),
  };

  global.fetch = async (url, options) => {
    assert.match(url, /chat_session_id=12345678-abcd-1234-abcd-1234567890ab/);
    assert.equal(options.headers.Authorization, 'Bearer mock-bearer-token');
    return {
      ok: true,
      json: async () => ({
        data: {
          biz_data: {
            chat_session: { current_message_id: 2 },
            chat_messages: [
              { message_id: 1, parent_id: null, role: 'USER', content: 'What is DeepSeek?' },
              {
                message_id: 2,
                parent_id: 1,
                role: 'ASSISTANT',
                content: 'DeepSeek is an AI assistant.',
              },
            ],
          },
        },
      }),
    };
  };

  const { DeepSeekParser } = await import('../content/parsers/deepseek.js');
  const parser = new DeepSeekParser();

  const result = await parser.parse();
  assert.equal(result.title, 'DeepSeek Chat');
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, 'User');
  assert.equal(result.messages[0].content, 'What is DeepSeek?');
  assert.equal(result.messages[1].role, 'DeepSeek');
  assert.equal(result.messages[1].content, 'DeepSeek is an AI assistant.');
});
