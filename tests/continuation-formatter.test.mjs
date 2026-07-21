import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ContinuationFormatter } from '../content/formatters/continuation.js';

test('ContinuationFormatter formats conversation with metadata and instructions', () => {
  const formatter = new ContinuationFormatter();
  const conversation = {
    title: 'Building a Node.js App',
    metadata: { Source: 'ChatGPT' },
    messages: [
      { role: 'User', content: 'How do I start an Express server?' },
      { role: 'Assistant', content: 'Use const app = express(); app.listen(3000);' },
    ],
  };

  const output = formatter.format(conversation, 'Explain error handling next.');

  assert.match(output, /previous conversation on ChatGPT/);
  assert.match(output, /Building a Node\.js App/);
  assert.match(output, /\[User\]: How do I start an Express server\?/);
  assert.match(output, /\[Assistant\]: Use const app = express\(\);/);
  assert.match(output, /Explain error handling next\./);
  assert.equal(formatter.getFileExtension(), 'txt');
  assert.equal(formatter.getMimeType(), 'text/plain');
});
