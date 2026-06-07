import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

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

  return import(path.join(tempDir, 'content', 'formatters', 'html.js'));
}

test('HTML formatter returns correct file extension and MIME type', async () => {
  const { HtmlFormatter } = await importFormatter();
  const formatter = new HtmlFormatter();

  assert.equal(formatter.getFileExtension(), 'html');
  assert.equal(formatter.getMimeType(), 'text/html');
});

test('HTML formatter converts parsed conversation into structured HTML document', async () => {
  const { HtmlFormatter } = await importFormatter();
  const formatter = new HtmlFormatter();

  const conversation = {
    title: 'Self-Consistency Test',
    messages: [
      { role: 'User', content: 'What is 2+2? Answer in code.\n\n```python\nprint(2+2)\n```' },
      {
        role: 'Assistant',
        content:
          'The answer is 4. Let us look at a table:\n\n| Expression | Value |\n|---|---|\n| 2+2 | 4 |\n\nAnd some math:\n$$x^2 + y^2 = z^2$$\n\nGood luck!',
      },
    ],
    metadata: {
      Source: 'ChatGPT',
      Model: 'GPT-4',
    },
  };

  const output = formatter.format(conversation);

  // Check document header / metadata
  assert.ok(output.includes('<!DOCTYPE html>'));
  assert.ok(output.includes('<title>Self-Consistency Test</title>'));
  assert.ok(output.includes('<span class="badge">ChatGPT</span>'));
  assert.ok(output.includes('Self-Consistency Test</h1>'));
  assert.ok(output.includes('theme-toggle-checkbox'));

  // Check message cards and styling
  assert.ok(output.includes('message-card role-user'));
  assert.ok(output.includes('message-card role-assistant'));

  // Check custom markdown block parsing (code blocks)
  assert.ok(output.includes('code-card'));
  assert.ok(output.includes('<span class="code-lang">python</span>'));
  assert.ok(output.includes('<code class="language-python">print(2+2)'));

  // Check custom table parsing
  assert.ok(output.includes('table-wrapper'));
  assert.ok(output.includes('<table>'));
  assert.ok(output.includes('<th style="text-align: left;">Expression</th>'));
  assert.ok(output.includes('<td style="text-align: left;">2+2</td>'));

  // Check math rendering wrapper
  assert.ok(output.includes('<span class="math-block">$$x^2 + y^2 = z^2$$</span>'));
});

test('HTML formatter unescapes backslash escapes inside headers and paragraphs', async () => {
  const { HtmlFormatter } = await importFormatter();
  const formatter = new HtmlFormatter();

  const conversation = {
    title: 'Escape Test',
    messages: [
      {
        role: 'User',
        content:
          '### 1\\. Heading\n\nThis contains \\*\\*bold\\*\\* and \\*italic\\* and \\[link\\](https://example.com) and 2\\. item.',
      },
    ],
  };

  const output = formatter.format(conversation);

  assert.ok(output.includes('<h3>1. Heading</h3>'));
  assert.ok(
    output.includes(
      '<p>This contains **bold** and *italic* and [link](https://example.com) and 2. item.</p>',
    ),
  );
});
