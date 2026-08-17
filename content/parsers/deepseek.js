import { ChatParser } from './base.js';
import { convertToMarkdown } from '../utils/html-to-markdown.js';

function getUserToken() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('userToken');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed?.value || parsed || null;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

function getConversationId() {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const path = window.location.pathname || window.location.href || '';
    return (
      path.match(/\/chat\/s\/([a-f0-9-]+)/)?.[1] ??
      path.match(/\/a\/chat\/s\/([a-f0-9-]+)/)?.[1] ??
      null
    );
  } catch {
    return null;
  }
}

async function fetchDeepSeekConversation(sessionId, token) {
  const url = `https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${sessionId}&cache_version=0`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API request failed: ${response.status}`);
  }

  const json = await response.json();
  const bizData = json?.data?.biz_data;
  const chatMessages = bizData?.chat_messages || [];
  const currentMsgId = bizData?.chat_session?.current_message_id;

  if (!chatMessages.length || currentMsgId == null) {
    return [];
  }

  const messageMap = new Map();
  chatMessages.forEach((msg) => {
    if (msg && msg.message_id != null) {
      messageMap.set(msg.message_id, msg);
    }
  });

  const branch = [];
  let currentId = currentMsgId;
  while (currentId != null && messageMap.has(currentId)) {
    const msgNode = messageMap.get(currentId);
    branch.push(msgNode);
    currentId = msgNode.parent_id ?? null;
  }

  branch.reverse();

  return branch
    .map((msgNode) => {
      const isUser = msgNode.role === 'USER' || msgNode.role === 'user';
      const role = isUser ? 'User' : 'DeepSeek';
      const content = msgNode.content || msgNode.text || '';
      return { role, content: content.trim() };
    })
    .filter((msg) => msg.content.length > 0);
}

export class DeepSeekParser extends ChatParser {
  name = 'DeepSeek';
  isAvailable(url) {
    return url.includes('chat.deepseek.com');
  }

  async parse() {
    const title = document.title || 'DeepSeek Chat';

    const currentUrl =
      typeof window !== 'undefined' && window.location ? window.location.href || '' : '';
    const metadata = {
      Source: 'DeepSeek',
      Date: new Date().toLocaleString(),
      Link: currentUrl,
    };

    // Primary: API Extraction
    try {
      const token = getUserToken();
      const sessionId = getConversationId();
      if (token && sessionId) {
        const apiMessages = await fetchDeepSeekConversation(sessionId, token);
        if (apiMessages && apiMessages.length > 0) {
          return { title, messages: apiMessages, url: currentUrl, metadata };
        }
      }
    } catch (e) {
      console.warn('[AI Exporter] DeepSeek API fetch failed, falling back to DOM:', e);
    }

    // Secondary: DOM Fallback
    const messages = [];

    // Selectors from research
    const userSelector = '.fbb737a4';
    const assistantSelector = '.ds-markdown';

    // We'll traverse the DOM to find these in order
    const allElements = document.querySelectorAll(`${userSelector}, ${assistantSelector}`);

    allElements.forEach((el) => {
      let role = 'Unknown';
      if (el.matches(userSelector)) {
        role = 'User';
      } else if (el.matches(assistantSelector)) {
        role = 'DeepSeek';
      }

      const text = convertToMarkdown(el);
      if (text.trim()) {
        messages.push({ role, content: text.trim() });
      }
    });

    // Fallback if the specific classes fail (e.g. class name rotation)
    if (messages.length === 0) {
      const messageRows = document.querySelectorAll('.ds-message-row, .message-row');
      messageRows.forEach((row) => {
        const isUser = row.classList.contains('ds-user-message');
        const role = isUser ? 'User' : 'DeepSeek';
        const text = convertToMarkdown(row);
        if (text.trim()) {
          messages.push({ role, content: text.trim() });
        }
      });
    }

    return { title, messages, url: currentUrl, metadata };
  }
}
