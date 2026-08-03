/**
 * preview-iframe.js
 *
 * Interactive script for the HTML export preview iframe.
 * Loaded as an external extension resource (chrome-extension://.../content/lib/preview-iframe.js)
 * so that it passes the Manifest V3 `script-src 'self'` CSP constraint.
 *
 * This file is intentionally NOT a JS module so it can be loaded with a plain
 * <script src="..."> tag inside the generated HTML document.
 */

/* ── Dark mode ────────────────────────────────────────────────────────────── */

const toggle = document.getElementById('theme-toggle-checkbox');
let storedTheme = null;
try {
  storedTheme = localStorage.getItem('theme');
} catch (e) {
  console.warn('localStorage is not available:', e);
}

if (!storedTheme) {
  storedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDocumentTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (toggle) toggle.checked = true;
  } else if (theme === 'light') {
    document.documentElement.removeAttribute('data-theme');
    if (toggle) toggle.checked = false;
  } else {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isSystemDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (toggle) toggle.checked = true;
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (toggle) toggle.checked = false;
    }
  }
}

applyDocumentTheme(storedTheme);

if (toggle) {
  toggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      try {
        localStorage.setItem('theme', 'dark');
      } catch (err) {}
    } else {
      document.documentElement.removeAttribute('data-theme');
      try {
        localStorage.setItem('theme', 'light');
      } catch (err) {}
    }
  });
}

/* ── postMessage handlers ─────────────────────────────────────────────────── */

window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.action === 'setTheme') {
    applyDocumentTheme(data.theme);
    return;
  }

  if (data.action === 'getScrollHeight') {
    const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const origin = event.origin && event.origin !== 'null' ? event.origin : '*';
    event.source.postMessage({ action: 'scrollHeight', value: h }, origin);
    return;
  }

  if (data.action === 'print') {
    window.print();
    return;
  }
});

/* ── Copy buttons (event delegation) ─────────────────────────────────────── */

document.addEventListener('click', (e) => {
  const codeBtn = e.target.closest('.copy-code-btn');
  if (codeBtn) {
    copyCode(codeBtn);
    return;
  }
  const msgBtn = e.target.closest('.copy-msg-btn');
  if (msgBtn) {
    copyMessage(msgBtn);
    return;
  }
});

async function copyCode(button) {
  const codeBlock = button.closest('.code-card').querySelector('code');
  const originalBtnText = button.querySelector('span').textContent;

  try {
    await navigator.clipboard.writeText(codeBlock.textContent);
    button.querySelector('span').textContent = 'Copied!';
    button.style.borderColor = '#10b981';
    button.style.color = '#10b981';

    setTimeout(() => {
      button.querySelector('span').textContent = originalBtnText;
      button.style.borderColor = '';
      button.style.color = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

async function copyMessage(button) {
  const card = button.closest('.message-card');
  const content = card ? card.querySelector('.message-content') : null;
  if (!content) return;
  const text = content.innerText || content.textContent || '';
  const span = button.querySelector('span');
  const originalText = span ? span.textContent : 'Copy';

  try {
    await navigator.clipboard.writeText(text.trim());
    if (span) span.textContent = 'Copied!';
    button.style.borderColor = '#10b981';
    button.style.color = '#10b981';

    setTimeout(() => {
      if (span) span.textContent = originalText;
      button.style.borderColor = '';
      button.style.color = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy message text: ', err);
  }
}

/* ── Syntax highlighting ──────────────────────────────────────────────────── */

function highlightFallbackCode() {
  const kwRegex = new RegExp(
    '\\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|async|await|try|catch|def|self|print|public|private|static|void|int|string|boolean|type|interface|struct)\\b',
    'g',
  );
  const strRegex = new RegExp('("([^"\\\\]|\\\\.)*"|\'([^\'\\\\]|\\\\.)*\')', 'g');
  const comRegex = new RegExp('//[^\\n]*|/\\*[\\s\\S]*?\\*/|#[^\\n]*', 'g');
  const numRegex = new RegExp('\\b\\d+(\\.\\d+)?\\b', 'g');

  document.querySelectorAll('pre code').forEach((codeBlock) => {
    let html = codeBlock.innerHTML;
    if (html.includes('class="token')) return;
    html = html
      .replace(comRegex, '<span class="token comment">$1</span>')
      .replace(strRegex, (m) => (m.startsWith('<span') ? m : '<span class="token string">' + m + '</span>'))
      .replace(kwRegex, '<span class="token keyword">$1</span>')
      .replace(numRegex, '<span class="token number">$1</span>');
    codeBlock.innerHTML = html;
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.Prism) {
    Prism.highlightAll();
  } else {
    highlightFallbackCode();
  }
});
