import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatFilename, DEFAULT_FILENAME_TEMPLATE } from '../content/utils/filename.js';

test('DEFAULT_FILENAME_TEMPLATE is configured with platform, title, and datetime', () => {
  assert.equal(DEFAULT_FILENAME_TEMPLATE, '{platform} - {title} - {datetime}');
});

test('formatFilename formats filename using default template', () => {
  const fixedDate = new Date(2026, 7, 19, 14, 5); // 2026-08-19 14:05
  const result = formatFilename(DEFAULT_FILENAME_TEMPLATE, {
    platform: 'Gemini',
    title: 'Comparing Markdown and PDF',
    date: fixedDate,
  });

  assert.equal(result, 'Gemini - Comparing Markdown and PDF - 2026-08-19_14-05');
});

test('formatFilename supports custom templates and individual tokens', () => {
  const fixedDate = new Date(2026, 7, 19, 9, 3); // 2026-08-19 09:03

  // Date first format
  const dateFirst = formatFilename('{date} - {platform} - {title}', {
    platform: 'ChatGPT',
    title: 'Quantum Computing Intro',
    date: fixedDate,
  });
  assert.equal(dateFirst, '2026-08-19 - ChatGPT - Quantum Computing Intro');

  // Time and date format
  const timeAndDate = formatFilename('{platform} [{date} {time}] {title}', {
    platform: 'Claude',
    title: 'Refactoring React Hooks',
    date: fixedDate,
  });
  assert.equal(timeAndDate, 'Claude [2026-08-19 09-03] Refactoring React Hooks');

  // Minimal format
  const minimal = formatFilename('{platform}_{title}', {
    platform: 'DeepSeek',
    title: 'Math Proof',
    date: fixedDate,
  });
  assert.equal(minimal, 'DeepSeek_Math Proof');
});

test('formatFilename sanitizes illegal filename characters', () => {
  const fixedDate = new Date(2026, 7, 19, 10, 0);
  const dirtyTitle = 'What is 10/2? *Are you sure:* "Yes" <maybe> | test';
  const result = formatFilename(DEFAULT_FILENAME_TEMPLATE, {
    platform: 'Gemini/Pro',
    title: dirtyTitle,
    date: fixedDate,
  });

  assert.ok(!/[/\\?%*:|"<>]/g.test(result), 'Filename should not contain illegal characters');
  assert.equal(result, 'GeminiPro - What is 102 Are you sure Yes maybe test - 2026-08-19_10-00');
});

test('formatFilename handles empty or missing inputs gracefully', () => {
  const fixedDate = new Date(2026, 7, 19, 10, 0);

  // Missing options
  const defaultResult = formatFilename(undefined, { date: fixedDate });
  assert.equal(defaultResult, 'AI - Conversation - 2026-08-19_10-00');

  // Empty string template
  const emptyTemplateResult = formatFilename('', {
    platform: 'Claude',
    title: 'My Chat',
    date: fixedDate,
  });
  assert.equal(emptyTemplateResult, 'Claude - My Chat - 2026-08-19_10-00');
});
