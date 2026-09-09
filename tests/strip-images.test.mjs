import test from 'node:test';
import assert from 'node:assert/strict';
import { stripImages } from '../content/utils/strip-images.js';

test('stripImages removes standard markdown images', () => {
  const input = 'Here is a chart:\n\n![Chart](https://example.com/chart.png)\n\nEnd of response.';
  const output = stripImages(input);
  assert.equal(output, 'Here is a chart:\n\nEnd of response.');
});

test('stripImages removes HTML img tags', () => {
  const input =
    'First line<img src="https://example.com/img.jpg" alt="test" />\n\n<img src="/local.png">Second line';
  const output = stripImages(input);
  assert.equal(output, 'First line\n\nSecond line');
});

test('stripImages removes leaked Google Search AI sn._setImageSrc calls with base64 data', () => {
  const input =
    "In this setup, your files live safely on Google Drive.[](https://forum.rclone.org/t/123)sn._setImageSrc('img-1','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAA==')\n\nNext section";
  const output = stripImages(input);
  assert.equal(
    output,
    'In this setup, your files live safely on Google Drive.[](https://forum.rclone.org/t/123)\n\nNext section',
  );
  assert.doesNotMatch(output, /_setImageSrc/);
  assert.doesNotMatch(output, /data:image/);
});

test('stripImages removes escaped sn.\\_setImageSrc calls from markdown', () => {
  const input =
    "Drive mounted.[](https://example.com)sn.\\_setImageSrc('img-2','data:image\\/png;base64,ABCDEF1234567890==')\n\nDone.";
  const output = stripImages(input);
  assert.equal(output, 'Drive mounted.[](https://example.com)\n\nDone.');
  assert.doesNotMatch(output, /_setImageSrc/);
  assert.doesNotMatch(output, /data:image/);
});

test('stripImages removes standalone base64 data URIs', () => {
  const input =
    'Raw data: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=\n\nText continues';
  const output = stripImages(input);
  assert.equal(output, 'Raw data:\n\nText continues');
});

test('stripImages cleans empty bullet points and attachment headers', () => {
  const input = [
    'Message text',
    '',
    '**Attachments & Images:**',
    '**Images:**',
    '- ![Alt](https://example.com/pic.png)',
    '',
  ].join('\n');
  const output = stripImages(input);
  assert.equal(output, 'Message text');
});

test('stripImages preserves non-image markdown links and formatting', () => {
  const input =
    'Check out [Documentation](https://example.com/docs) and **bold text** with `code`.';
  const output = stripImages(input);
  assert.equal(output, input);
});

test('stripImages removes multiline base64 encoded markdown images', () => {
  const input = [
    'Before image',
    '![Large Diagram](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
    '+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)',
    'After image',
  ].join('\n');
  const output = stripImages(input);
  assert.equal(output, 'Before image\n\nAfter image');
  assert.doesNotMatch(output, /data:image/);
});

test('stripImages removes standalone data URIs with escaped slashes', () => {
  const input =
    'Content: data:image\\/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////\n\nFollowing text.';
  const output = stripImages(input);
  assert.equal(output, 'Content:\n\nFollowing text.');
  assert.doesNotMatch(output, /data:image/);
});

test('stripImages preserves markdown images inside inline code and fenced code blocks', () => {
  const input = [
    'Here is an example in code: `![alt](https://example.com/demo.png)`',
    '',
    '```markdown',
    '![fenced](https://example.com/fenced.png)',
    '```',
    '',
    'And an actual image: ![actual](https://example.com/real.png)',
  ].join('\n');
  const output = stripImages(input);
  assert.match(output, /`!\[alt\]\(https:\/\/example\.com\/demo\.png\)`/);
  assert.match(output, /!\[fenced\]\(https:\/\/example\.com\/fenced\.png\)/);
  assert.doesNotMatch(output, /!\[actual\]/);
});

test('stripImages removes reference-style images and their matching definitions', () => {
  const input = [
    'Overview text',
    '',
    '![Diagram][image-1]',
    '![Remote][remote-img]',
    '',
    '[image-1]: data:image/png;base64,iVBORw0KGgoAAA==',
    '[remote-img]: https://example.com/remote.png "Remote Title"',
    '[regular-link]: https://example.com/page',
    '',
    'Conclusion text',
  ].join('\n');
  const output = stripImages(input);
  assert.doesNotMatch(output, /!\[Diagram\]/);
  assert.doesNotMatch(output, /!\[Remote\]/);
  assert.doesNotMatch(output, /\[image-1\]:/);
  assert.doesNotMatch(output, /\[remote-img\]:/);
  assert.match(output, /\[regular-link\]: https:\/\/example\.com\/page/);
  assert.match(
    output,
    /Overview text\n\n\[regular-link\]: https:\/\/example\.com\/page\n\nConclusion text/,
  );
});

test('stripImages preserves content following an empty attachments section', () => {
  const input = [
    'First section',
    '',
    '**Attachments & Images:**',
    '- ![Photo](https://example.com/photo.png)',
    '',
    '## Next Section',
    '',
    'Important text that must be preserved.',
  ].join('\n');
  const output = stripImages(input);
  assert.doesNotMatch(output, /\*\*Attachments & Images:\*\*/);
  assert.match(
    output,
    /First section\n\n## Next Section\n\nImportant text that must be preserved\./,
  );
});

test('stripImages preserves reference definitions if shared by an ordinary text link', () => {
  const input = [
    'Check ![logo][shared] and also read [Documentation][shared].',
    '',
    '[shared]: https://example.com/shared-resource',
  ].join('\n');
  const output = stripImages(input);
  assert.doesNotMatch(output, /!\[logo\]/);
  assert.match(output, /\[Documentation\]\[shared\]/);
  assert.match(output, /\[shared\]: https:\/\/example\.com\/shared-resource/);
});
