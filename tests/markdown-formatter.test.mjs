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
