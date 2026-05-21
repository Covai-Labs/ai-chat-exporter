const TURN_SELECTOR = 'section[data-testid^="conversation-turn-"]';
const DEFAULT_RENDER_WAIT_MS = 160;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isScrollable(element) {
  return element && element.scrollHeight > element.clientHeight + 80;
}

function messageKey(message) {
  if (message.key) return message.key;
  return `${message.role}:${message.content.replace(/\s+/g, ' ').trim()}`;
}

function publicMessage(message) {
  return {
    role: message.role,
    content: message.content,
  };
}

export function getConversationTurnIndex(turn) {
  const testId = turn.getAttribute('data-testid') || '';
  const match = testId.match(/^conversation-turn-(\d+)$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function getConversationTurns(doc = document) {
  return Array.from(doc.querySelectorAll(TURN_SELECTOR)).sort((a, b) => {
    return getConversationTurnIndex(a) - getConversationTurnIndex(b);
  });
}

export function findChatGPTScrollRoot(turns, doc = document) {
  const firstTurn = turns.find(Boolean);
  let current = firstTurn?.parentElement || null;

  while (current) {
    if (isScrollable(current)) return current;
    current = current.parentElement;
  }

  const main = doc.querySelector('main');
  if (isScrollable(main)) return main;

  return doc.scrollingElement || doc.documentElement || doc.body;
}

export async function collectMountedTurnMessages({
  turns,
  scrollRoot,
  extractMessage,
  waitForRender = delay,
  renderWaitMs = DEFAULT_RENDER_WAIT_MS,
  renderAttempts = 4,
}) {
  const originalTop = scrollRoot?.scrollTop;
  const seen = new Set();
  const messages = [];
  const orderedTurns = [...turns].sort((a, b) => {
    return getConversationTurnIndex(a) - getConversationTurnIndex(b);
  });

  try {
    for (const turn of orderedTurns) {
      turn.scrollIntoView({ block: 'center' });

      let message = null;
      for (let attempt = 0; attempt < renderAttempts; attempt += 1) {
        await waitForRender(renderWaitMs);
        message = extractMessage(turn);
        if (message?.content) break;
      }

      if (!message?.content) continue;

      const key = messageKey(message);
      if (seen.has(key)) continue;

      seen.add(key);
      messages.push(publicMessage(message));
    }
  } finally {
    if (scrollRoot && Number.isFinite(originalTop)) {
      scrollRoot.scrollTop = originalTop;
    }
  }

  return messages;
}
