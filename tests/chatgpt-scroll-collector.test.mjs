import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectMountedTurnMessages,
  getConversationTurnIndex,
} from '../content/parsers/chatgpt_scroll_collector.js';

class FakeTurn {
  constructor(index, message) {
    this.message = message;
    this.scrollCount = 0;
    this.testId = `conversation-turn-${index}`;
  }

  getAttribute(name) {
    return name === 'data-testid' ? this.testId : null;
  }

  scrollIntoView() {
    this.scrollCount += 1;
  }
}

test('getConversationTurnIndex parses ChatGPT turn ids', () => {
  const turn = new FakeTurn(23, null);

  assert.equal(getConversationTurnIndex(turn), 23);
});

test('collectMountedTurnMessages scrolls turns and dedupes extracted messages', async () => {
  const turns = [
    new FakeTurn(2, { key: 'assistant:hello', role: 'ChatGPT', content: 'hello' }),
    new FakeTurn(1, { key: 'user:question', role: 'User', content: 'question' }),
    new FakeTurn(3, { key: 'assistant:hello', role: 'ChatGPT', content: 'hello' }),
  ];
  const visited = [];
  const scrollRoot = { scrollTop: 120 };

  const messages = await collectMountedTurnMessages({
    turns,
    scrollRoot,
    waitForRender: async () => {},
    extractMessage: (turn) => {
      visited.push(getConversationTurnIndex(turn));
      return turn.message;
    },
  });

  assert.deepEqual(visited, [1, 2, 3]);
  assert.deepEqual(messages, [
    { role: 'User', content: 'question' },
    { role: 'ChatGPT', content: 'hello' },
  ]);
  assert.equal(scrollRoot.scrollTop, 120);
  assert.deepEqual(
    turns.map((turn) => turn.scrollCount),
    [1, 1, 1],
  );
});
