import { ExportFormatter } from './base.js';

export class HtmlFormatter extends ExportFormatter {
  format(conversation) {
    const { title, messages } = conversation;
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;

    const platform = conversation.metadata?.Source || 'AI';
    const link = conversation.url || conversation.metadata?.Link || '';

    // Convert messages
    const formattedMessages = messages
      .map((msg) => {
        const isUser = msg.role === 'User';
        const roleClass = isUser ? 'role-user' : 'role-assistant';
        const roleName = isUser ? 'User' : platform;
        const avatarText = isUser ? 'U' : platform[0];
        const htmlContent = markdownToHtml(msg.content);

        return `
        <div class="message-card ${roleClass}">
          <div class="message-header">
            <div class="message-avatar">${avatarText}</div>
            <span>${roleName}</span>
          </div>
          <div class="message-content">
            ${htmlContent}
          </div>
        </div>
      `;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || 'AI Chat Export')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&family=Fira+Code:wght@400;500&display=swap');

    :root {
      --bg-app: #f8fafc;
      --bg-card: #ffffff;
      --bg-bubble-user: #e2e8f0;
      --bg-bubble-ai: #ffffff;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --accent: #4f46e5;
      --accent-light: #e0e7ff;
      --border: #e2e8f0;
      --code-bg: #0f172a;
      --code-text: #f8fafc;
      --code-header-bg: #1e293b;
      --scrollbar-thumb: #cbd5e1;
    }

    [data-theme="dark"] {
      --bg-app: #0f172a;
      --bg-card: #1e293b;
      --bg-bubble-user: #334155;
      --bg-bubble-ai: #1e293b;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent: #6366f1;
      --accent-light: #312e81;
      --border: #334155;
      --code-bg: #020617;
      --code-text: #f8fafc;
      --code-header-bg: #0f172a;
      --scrollbar-thumb: #475569;
    }

    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: var(--bg-app);
      color: var(--text-primary);
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .container {
      width: 100%;
      max-width: 900px;
      box-sizing: border-box;
      padding: 2rem 1.5rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .header-title-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0;
    }

    .metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .badge {
      background-color: var(--accent-light);
      color: var(--accent);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-weight: 500;
      font-size: 0.75rem;
    }

    .theme-switch-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .theme-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 24px;
    }

    .theme-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: .3s;
      border-radius: 34px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    input:checked + .slider {
      background-color: var(--accent);
    }

    input:checked + .slider:before {
      transform: translateX(24px);
    }

    .message-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .message-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-radius: 1rem;
      border: 1px solid var(--border);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: transform 0.2s ease, border-color 0.3s ease, background-color 0.3s ease;
    }

    .message-card:hover {
      transform: translateY(-2px);
    }

    .message-card.role-user {
      background-color: var(--bg-bubble-user);
      align-self: flex-end;
      max-width: 85%;
    }

    .message-card.role-assistant {
      background-color: var(--bg-bubble-ai);
      align-self: flex-start;
      width: 100%;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .message-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .message-card.role-user .message-avatar {
      background-color: var(--accent);
      color: white;
    }

    .message-card.role-assistant .message-avatar {
      background-color: #10b981;
      color: white;
    }

    .message-content {
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .message-content p:first-child {
      margin-top: 0;
    }

    .message-content p:last-child {
      margin-bottom: 0;
    }

    .table-wrapper {
      overflow-x: auto;
      margin: 1rem 0;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th, td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    th {
      background-color: var(--bg-app);
      font-weight: 600;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .code-card {
      margin: 1rem 0;
      border-radius: 0.5rem;
      overflow: hidden;
      background-color: var(--code-bg);
      color: var(--code-text);
      border: 1px solid var(--border);
    }

    .code-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 1rem;
      background-color: var(--code-header-bg);
      border-bottom: 1px solid var(--border);
      font-family: 'Fira Code', monospace;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .code-lang {
      text-transform: lowercase;
    }

    .copy-code-btn {
      background: none;
      border: 1px solid var(--border);
      color: #94a3b8;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.2s ease;
    }

    .copy-code-btn:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--code-text);
    }

    .copy-icon {
      fill: currentColor;
    }

    pre {
      margin: 0;
      padding: 1rem;
      overflow-x: auto;
    }

    code {
      font-family: 'Fira Code', Consolas, Monaco, monospace;
      font-size: 0.875rem;
    }

    :not(pre) > code {
      background-color: var(--bg-bubble-user);
      color: var(--text-primary);
      padding: 0.15rem 0.3rem;
      border-radius: 0.25rem;
      font-size: 0.85em;
    }

    blockquote {
      margin: 1rem 0;
      padding-left: 1rem;
      border-left: 4px solid var(--accent);
      color: var(--text-secondary);
      font-style: italic;
    }

    .math-block {
      display: block;
      margin: 1rem 0;
      text-align: center;
      overflow-x: auto;
    }

    .math-inline {
      padding: 0 0.15rem;
    }

    h2, h3, h4 {
      font-family: 'Outfit', sans-serif;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }

    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-secondary);
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body, { delimiters: [ {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false} ] });"></script>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-title-section">
        <div class="metadata">
          <span class="badge">${escapeHtml(platform)}</span>
          <span class="meta-item">Exported: ${formattedDate}</span>
          ${link ? `<span class="meta-item"><a href="${escapeHtml(link)}" target="_blank" style="color: inherit;">Original Link</a></span>` : ''}
        </div>
        <h1>${escapeHtml(title || 'AI Chat Export')}</h1>
      </div>
      <div class="theme-switch-wrapper">
        <span style="font-size: 0.85rem; color: var(--text-secondary);">Dark Theme</span>
        <label class="theme-switch" for="theme-toggle-checkbox">
          <input type="checkbox" id="theme-toggle-checkbox" />
          <div class="slider"></div>
        </label>
      </div>
    </header>

    <main class="message-list">
      ${formattedMessages}
    </main>
  </div>

  <script>
    const toggle = document.getElementById('theme-toggle-checkbox');
    const storedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    if (storedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggle.checked = true;
    }
    
    toggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
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
  </script>
</body>
</html>`;
  }

  getFileExtension() {
    return 'html';
  }

  getMimeType() {
    return 'text/html';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineParse(text) {
  const placeholders = [];
  let tokenCounter = 0;

  // 1. Extract block math $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
    const id = `{{MATHBLOCK${tokenCounter++}}}`;
    placeholders.push({
      id,
      html: `<span class="math-block">$$${math}$$</span>`,
    });
    return id;
  });

  // 2. Extract inline math $...$
  text = text.replace(/\$([^$]+?)\$/g, (match, math) => {
    const id = `{{MATHINLINE${tokenCounter++}}}`;
    placeholders.push({
      id,
      html: `<span class="math-inline">$${math}$</span>`,
    });
    return id;
  });

  // 3. Extract inline code `...`
  text = text.replace(/`([^`]+?)`/g, (match, code) => {
    const id = `{{INLINECODE${tokenCounter++}}}`;
    const escapedCode = escapeHtml(code);
    placeholders.push({
      id,
      html: `<code>${escapedCode}</code>`,
    });
    return id;
  });

  // 4. HTML escape remaining text
  text = escapeHtml(text);

  // 5. Replace bold **...** or __...__
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // 6. Replace italic *...* or _..._
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');

  // 7. Replace links [text](url)
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
    const safeUrl = url.replace(/&amp;/g, '&');
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });

  // 8. Restore placeholders
  placeholders.forEach(({ id, html }) => {
    text = text.replace(id, () => html);
  });

  return text;
}

function renderTable(rows) {
  if (rows.length === 0) return '';

  const isSeparator = (r) => /^[|\s:-]+$/.test(r);

  const parsedRows = rows.map((r) => {
    const cells = r.split('|').map((c) => c.trim());
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();
    return cells;
  });

  const bodyRows = [];
  let headerCells = [];
  let alignments = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const rawRow = rows[i];
    const cells = parsedRows[i];

    if (i === 0) {
      headerCells = cells;
    } else if (isSeparator(rawRow)) {
      alignments = cells.map((cell) => {
        const left = cell.startsWith(':');
        const right = cell.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
      });
    } else {
      bodyRows.push(cells);
    }
  }

  let tableHtml = '<div class="table-wrapper"><table>\n';

  if (headerCells.length > 0) {
    tableHtml += '<thead><tr>\n';
    headerCells.forEach((cell, idx) => {
      const align = alignments[idx] ? ` style="text-align: ${alignments[idx]};"` : '';
      tableHtml += `  <th${align}>${inlineParse(cell)}</th>\n`;
    });
    tableHtml += '</tr></thead>\n';
  }

  if (bodyRows.length > 0) {
    tableHtml += '<tbody>\n';
    bodyRows.forEach((row) => {
      tableHtml += '<tr>\n';
      row.forEach((cell, idx) => {
        const align = alignments[idx] ? ` style="text-align: ${alignments[idx]};"` : '';
        tableHtml += `  <td${align}>${inlineParse(cell)}</td>\n`;
      });
      tableHtml += '</tr>\n';
    });
    tableHtml += '</tbody>\n';
  }

  tableHtml += '</table></div>\n';
  return tableHtml;
}

export function markdownToHtml(mdText) {
  if (!mdText) return '';
  const lines = mdText.split(/\r?\n/);
  let html = '';

  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  let inList = false;
  let listType = '';

  let inTable = false;
  let tableRows = [];

  let inBlockquote = false;
  let blockquoteContent = [];

  let inParagraph = false;
  let paragraphContent = [];

  function closeAllBlocks() {
    if (inCodeBlock) {
      const codeText = codeLines.join('\n');
      const escapedCode = escapeHtml(codeText);
      const displayLang = codeLang || 'code';
      html += `<div class="code-card">
  <div class="code-card-header">
    <span class="code-lang">${displayLang}</span>
    <button class="copy-code-btn" onclick="copyCode(this)">
      <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
      <span>Copy</span>
    </button>
  </div>
  <pre><code class="language-${displayLang}">${escapedCode}</code></pre>
</div>\n`;
      inCodeBlock = false;
      codeLines = [];
      codeLang = '';
    }

    if (inList) {
      html += `</${listType}>\n`;
      inList = false;
      listType = '';
    }

    if (inTable) {
      html += renderTable(tableRows);
      inTable = false;
      tableRows = [];
    }

    if (inBlockquote) {
      html += `<blockquote>${inlineParse(blockquoteContent.join(' '))}</blockquote>\n`;
      inBlockquote = false;
      blockquoteContent = [];
    }

    if (inParagraph) {
      html += `<p>${inlineParse(paragraphContent.join(' '))}</p>\n`;
      inParagraph = false;
      paragraphContent = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        closeAllBlocks();
      } else {
        closeAllBlocks();
        inCodeBlock = true;
        codeLang = trimmed.substring(3).trim().toLowerCase();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (trimmed === '') {
      closeAllBlocks();
      continue;
    }

    if (line.startsWith('>')) {
      if (!inBlockquote) {
        closeAllBlocks();
        inBlockquote = true;
      }
      const content = line.substring(1).replace(/^\s/, '');
      blockquoteContent.push(content);
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      closeAllBlocks();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      html += `<h${level}>${inlineParse(text)}</h${level}>\n`;
      continue;
    }

    if (trimmed === '* * *' || trimmed === '***' || trimmed === '---' || trimmed === '___') {
      closeAllBlocks();
      html += `<hr>\n`;
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        closeAllBlocks();
        inTable = true;
      }
      tableRows.push(line);
      continue;
    } else if (inTable) {
      closeAllBlocks();
    }

    const ulMatch = line.match(/^([*\-+])\s+(.*)$/);
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (ulMatch) {
      if (inList && listType !== 'ul') {
        closeAllBlocks();
      }
      if (!inList) {
        closeAllBlocks();
        inList = true;
        listType = 'ul';
        html += `<ul>\n`;
      }
      html += `<li>${inlineParse(ulMatch[2])}</li>\n`;
      continue;
    }

    if (olMatch) {
      if (inList && listType !== 'ol') {
        closeAllBlocks();
      }
      if (!inList) {
        closeAllBlocks();
        inList = true;
        listType = 'ol';
        html += `<ol>\n`;
      }
      html += `<li>${inlineParse(olMatch[2])}</li>\n`;
      continue;
    }

    if (inList || inBlockquote || inTable) {
      closeAllBlocks();
    }

    if (!inParagraph) {
      inParagraph = true;
    }
    paragraphContent.push(trimmed);
  }

  closeAllBlocks();

  return html;
}
