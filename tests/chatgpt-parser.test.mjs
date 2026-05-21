import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ChatGPTParser } from '../content/parsers/chatgpt.js';

class FakeElement {
  constructor({ attributes = {}, children = [], html = '', text = '' } = {}) {
    this.attributes = attributes;
    this.children = children;
    this.innerHTML = html;
    this.textContent = text;
    this.innerText = text;
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  matches(selector) {
    return (
      selector === '[data-message-author-role]' &&
      Boolean(this.attributes['data-message-author-role'])
    );
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    if (selector === '[data-message-author-role]') {
      return this.children.filter((child) => child.matches(selector));
    }

    if (selector === '.markdown' || selector === '.prose') {
      return this.children.filter((child) => child.attributes.class === selector.slice(1));
    }

    return [];
  }

  closest() {
    return null;
  }

  cloneNode() {
    return new FakeElement({
      attributes: this.attributes,
      children: this.children,
      html: this.innerHTML,
      text: this.textContent,
    });
  }
}

global.HTMLElement = FakeElement;

test('extractMessage combines multiple assistant blocks in one ChatGPT turn', () => {
  const parser = new ChatGPTParser();
  parser.convertContentElement = (element) => element.textContent;
  const preThinkingMarkdown = new FakeElement({
    attributes: { class: 'markdown' },
    html: '<p>I will inspect the provided documents first.</p>',
    text: 'I will inspect the provided documents first.',
  });
  const finalMarkdown = new FakeElement({
    attributes: { class: 'markdown' },
    html: '<p>Final answer content after thinking mode.</p>',
    text: 'Final answer content after thinking mode.',
  });
  const turn = new FakeElement({
    attributes: { 'data-testid': 'conversation-turn-22' },
    children: [
      new FakeElement({
        attributes: { 'data-message-author-role': 'assistant' },
        children: [preThinkingMarkdown],
      }),
      new FakeElement({
        attributes: { 'data-message-author-role': 'assistant' },
        children: [finalMarkdown],
      }),
    ],
  });

  const message = parser.extractMessage(turn);

  assert.equal(message.role, 'ChatGPT');
  assert.equal(
    message.content,
    'I will inspect the provided documents first.\n\n' +
      'Final answer content after thinking mode.',
  );
});
