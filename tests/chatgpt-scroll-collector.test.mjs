import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHTML } from 'linkedom';

import {
  collectMountedTurnMessages,
  getConversationTurnIndex,
  getConversationTurns,
} from '@covai/parser-core/ai/chatgpt_scroll_collector';

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

test('getConversationTurns finds articles, testids, and ignores nested duplicates', () => {
  const { document: testDoc } = parseHTML(`
    <div>
      <article data-testid="conversation-turn-1">
        <div data-message-author-role="user">User prompt 1</div>
      </article>
      <article data-testid="conversation-turn-2">
        <div data-message-author-role="assistant">Assistant reply 1</div>
      </article>
      <section data-turn-id="3">
        <div data-message-author-role="user">User prompt 2</div>
      </section>
    </div>
  `);

  const turns = getConversationTurns(testDoc);
  assert.equal(turns.length, 3);
  assert.equal(getConversationTurnIndex(turns[0]), 1);
  assert.equal(getConversationTurnIndex(turns[1]), 2);
  assert.equal(getConversationTurnIndex(turns[2]), 3);
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

test('collectMountedTurnMessages overrides scrollBehavior silently and restores original position', async () => {
  const turns = [
    new FakeTurn(1, { key: 'user:q1', role: 'User', content: 'q1' }),
    new FakeTurn(2, { key: 'assistant:a1', role: 'ChatGPT', content: 'a1' }),
  ];
  const scrollRoot = { scrollTop: 450, style: { scrollBehavior: 'smooth' } };
  const mockDoc = {
    body: {
      appendChild: () => {},
    },
    createElement: () => ({
      style: {},
      remove: () => {},
    }),
    querySelectorAll: () => [],
  };

  const messages = await collectMountedTurnMessages({
    turns,
    scrollRoot,
    waitForRender: async () => {},
    extractMessage: (turn) => turn.message,
    doc: mockDoc,
  });

  assert.equal(messages.length, 2);
  assert.equal(scrollRoot.scrollTop, 450);
  assert.equal(scrollRoot.style.scrollBehavior, 'smooth');
});
