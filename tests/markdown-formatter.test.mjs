import assert from 'node:assert/strict';
import test from 'node:test';
import { MarkdownFormatter } from '../content/formatters/markdown.js';

test('MarkdownFormatter includes top site link, platform source, hyperlinked URL, and omits missing fields', () => {
  const formatter = new MarkdownFormatter();

  const conversation = {
    title: 'Test Conversation',
    messages: [
      { role: 'User', content: 'Hello' },
      { role: 'Assistant', content: 'Hi there!' },
    ],
    metadata: {
      Source: 'Claude',
      Date: '8/6/2026 12:00:00',
      Link: 'https://claude.ai/chat/123',
      Model: 'Claude 3.5 Sonnet',
      Method: 'API',
    },
  };

  const output = formatter.format(conversation);

  assert.ok(output.includes('# Test Conversation'));
  assert.ok(
    output.includes('**Exported with:** [AI Chat Exporter](https://ai-chat-exporter.covai.org)'),
  );
  assert.ok(output.includes('**Source:** Claude'));
  assert.ok(output.includes('**Date:** 8/6/2026 12:00:00'));
  assert.ok(output.includes('**Link:** [https://claude.ai/chat/123](https://claude.ai/chat/123)'));
  assert.ok(output.includes('**Model:** Claude 3.5 Sonnet'));
  assert.ok(output.includes('**Method:** API'));
});

test('MarkdownFormatter omits Model and Link when missing', () => {
  const formatter = new MarkdownFormatter();

  const conversation = {
    title: 'Minimal Metadata Chat',
    messages: [{ role: 'User', content: 'Hello' }],
    metadata: {
      Source: 'Gemini',
      Date: '8/6/2026 12:00:00',
    },
  };

  const output = formatter.format(conversation);

  assert.ok(output.includes('**Source:** Gemini'));
  assert.ok(!output.includes('**Link:**'));
  assert.ok(!output.includes('**Model:**'));
});

test('MarkdownFormatter normalizes bracket LaTeX math delimiters to $ and $$ while preserving code', () => {
  const formatter = new MarkdownFormatter();

  const conversation = {
    title: 'LaTeX Test',
    messages: [
      {
        role: 'Assistant',
        content: `Here is inline \\( e^{i\\pi} + 1 = 0 \\) and display math:
\\[
E = mc^2
\\]
Also escaped inline \\\\( a^2 + b^2 = c^2 \\\\) and display:
\\\\[
\\int_0^1 x dx = \\frac{1}{2}
\\\\]

Here is code that must NOT be modified:
\`\`\`python
# Code with brackets
arr = [1, 2, 3]
def func(x):
    return [x]
\`\`\`
And inline \`item[0]\` code.`,
      },
    ],
  };

  const output = formatter.format(conversation);

  // Check inline math converted to $...$
  assert.ok(output.includes('$e^{i\\pi} + 1 = 0$'));
  assert.ok(output.includes('$a^2 + b^2 = c^2$'));

  // Check display math converted to $$...$$
  assert.ok(output.includes('$$E = mc^2$$'));
  assert.ok(output.includes('$$\\int_0^1 x dx = \\frac{1}{2}$$'));

  // Check code blocks remain unchanged
  assert.ok(output.includes('arr = [1, 2, 3]'));
  assert.ok(output.includes('return [x]'));
  assert.ok(output.includes('`item[0]`'));
});
