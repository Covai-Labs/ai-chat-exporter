import test from 'node:test';
import assert from 'node:assert/strict';
import { ContinuationFormatter, stripEncodedImages } from '../content/formatters/continuation.js';

test('stripEncodedImages replaces base64 markdown images with placeholders', () => {
  const input =
    'Here is an image: ![Chart Data](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...) and some text.';
  const output = stripEncodedImages(input);
  assert.equal(output, 'Here is an image: [Chart Data] and some text.');
});

test('stripEncodedImages handles untitled/empty alt images', () => {
  const input = '![ ](data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...)';
  const output = stripEncodedImages(input);
  assert.equal(output, '[Image]');
});

test('stripEncodedImages preserves standard http/https image links', () => {
  const input = 'Check out this diagram: ![Architecture Diagram](https://example.com/diagram.png)';
  const output = stripEncodedImages(input);
  assert.equal(
    output,
    'Check out this diagram: ![Architecture Diagram](https://example.com/diagram.png)',
  );
});

test('ContinuationFormatter automatically strips base64 images from conversation messages', () => {
  const formatter = new ContinuationFormatter();
  const conversation = {
    title: 'Data Analysis',
    metadata: { Source: 'ChatGPT' },
    messages: [
      {
        role: 'User',
        content: 'Look at this graph: ![Graph](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...)',
      },
      {
        role: 'Assistant',
        content:
          'I see the graph. Here is an external reference: ![Ref](https://cdn.example.com/ref.png)',
      },
    ],
  };

  const payload = formatter.format(conversation);

  assert.ok(!payload.includes('data:image/png;base64'), 'Payload should not contain base64 data');
  assert.ok(
    payload.includes('[User]: Look at this graph: [Graph]'),
    'Encoded image should be replaced with placeholder',
  );
  assert.ok(
    payload.includes('![Ref](https://cdn.example.com/ref.png)'),
    'HTTP image link should be preserved',
  );
});
