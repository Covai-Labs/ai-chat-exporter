import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

test('stripImages removes markdown images and leaves message content clean', () => {
  const mainJs = fs.readFileSync('content/main.js', 'utf8');
  // Extract stripImages function from main.js
  const match = mainJs.match(/function stripImages[\s\S]*?return cleaned;\s*\n\}/);
  assert.ok(match, 'stripImages function should exist in main.js');

  const functionCode = match[0];
  const sandbox = {};
  vm.runInNewContext(functionCode + '\nglobalThis.stripImages = stripImages;', sandbox);
  const stripImages = sandbox.stripImages;

  // Case 1: Simple inline image removal
  assert.equal(
    stripImages('Check out this image: ![Football Shoe](https://example.com/shoe.png) and text'),
    'Check out this image:  and text',
  );

  // Case 2: Strip list sections that only contained images
  assert.equal(stripImages('**Images:**\n- ![alt](url)'), '');

  // Case 3: Retain non-image attachments while cleaning image bullet points
  assert.equal(
    stripImages('Some text\n\n**Attachments & Images:**\n- ![alt](url)\n- file.txt'),
    'Some text\n\n**Attachments & Images:**\n\n- file.txt',
  );
});
