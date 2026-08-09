import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeHtml } from '../content/utils/sanitizer.js';

test('sanitizeHtml strips dangerous script tags and inline handlers', () => {
  const dirty =
    '<script>alert("xss")</script><p>Hello <strong>World</strong></p><img src="x" onerror="alert(1)">';
  const clean = sanitizeHtml(dirty);

  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('onerror='));
  assert.ok(clean.includes('<p>Hello <strong>World</strong></p>'));
});

test('sanitizeHtml preserves standard formatting and safe tags', () => {
  const input =
    '<div class="message-card"><pre><code>console.log(42);</code></pre><table><tr><td>Data</td></tr></table></div>';
  const clean = sanitizeHtml(input);

  assert.ok(clean.includes('class="message-card"'));
  assert.ok(clean.includes('console.log(42);'));
  assert.ok(clean.includes('<table>'));
});
