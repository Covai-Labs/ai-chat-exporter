import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parseHTML } from 'linkedom';

async function importFormatter() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-chat-exporter-'));
  await fs.mkdir(path.join(tempDir, 'content', 'formatters'), {
    recursive: true,
  });
  await fs.writeFile(path.join(tempDir, 'package.json'), '{"type":"module"}');
  await fs.copyFile(
    path.resolve('content/formatters/base.js'),
    path.join(tempDir, 'content', 'formatters', 'base.js'),
  );
  await fs.copyFile(
    path.resolve('content/formatters/html.js'),
    path.join(tempDir, 'content', 'formatters', 'html.js'),
  );
  await fs.copyFile(
    path.resolve('content/formatters/image.js'),
    path.join(tempDir, 'content', 'formatters', 'image.js'),
  );

  return import(path.join(tempDir, 'content', 'formatters', 'image.js'));
}

test('ImageFormatter returns correct file extension and MIME type', async () => {
  const { ImageFormatter } = await importFormatter();
  const formatter = new ImageFormatter();

  assert.equal(formatter.getFileExtension(), 'png');
  assert.equal(formatter.getMimeType(), 'image/png');
});

test('ImageFormatter creates styled screenshot container with conversation content', async () => {
  const { ImageFormatter } = await importFormatter();
  const formatter = new ImageFormatter();

  // Setup DOM environment using LinkeDOM if document is missing
  if (typeof globalThis.document === 'undefined') {
    const { document, window } = parseHTML('<!DOCTYPE html><html><body></body></html>');
    globalThis.document = document;
    globalThis.window = window;
  }

  const conversation = {
    title: 'PNG Export Test',
    messages: [
      { role: 'User', content: 'Hello AI!' },
      { role: 'Assistant', content: 'Hello Human! Here is code:\n```js\nconsole.log(1);\n```' },
    ],
    metadata: {
      Source: 'ChatGPT',
    },
  };

  const container = formatter.createScreenshotContainer(conversation);

  assert.ok(container);
  assert.equal(container.className, 'ai-exporter-png-container');

  const html = container.innerHTML;
  assert.ok(html.includes('PNG Export Test'));
  assert.ok(html.includes('ChatGPT'));
  assert.ok(html.includes('Hello AI!'));
  assert.ok(html.includes('Hello Human!'));
  assert.ok(html.includes('Exported with <strong>AI Chat Exporter</strong>'));
  assert.ok(html.includes('https://ai-chat-exporter.covai.org/'));
  assert.ok(html.includes('.copy-code-btn'));
  assert.ok(html.includes('display: none !important'));
  assert.ok(html.includes('.code-card'));
});
