import { ExportFormatter } from './base.js';
import { markdownToHtml, escapeHtml } from './html.js';

export class DocFormatter extends ExportFormatter {
  format(conversation) {
    const { title, messages } = conversation;
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;

    const platform = conversation.metadata?.Source || 'AI';

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
            <span class="message-avatar">${avatarText}</span>
            <span>${escapeHtml(roleName)}</span>
          </div>
          <div class="message-content">
            ${htmlContent}
          </div>
        </div>
      `;
      })
      .join('\n');

    return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title || 'AI Chat Export')}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Normal</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
      margin: 1in;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #1e293b;
      font-family: 'Calibri', 'Arial', sans-serif;
      margin-top: 1em;
      margin-bottom: 0.5em;
    }
    .header-box {
      border-bottom: 2pt solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .chat-title {
      font-size: 20pt;
      font-weight: bold;
      color: #1e293b;
      margin: 0 0 6px 0;
    }
    .meta-info {
      font-size: 9.5pt;
      color: #64748b;
    }
    .message-card {
      margin-bottom: 16px;
      padding: 12px 16px;
      border: 1pt solid #cbd5e1;
      background-color: #ffffff;
    }
    .role-user {
      background-color: #f8fafc;
      border-left: 4pt solid #4f46e5;
    }
    .role-assistant {
      background-color: #ffffff;
      border-left: 4pt solid #10b981;
    }
    .message-header {
      font-weight: bold;
      font-size: 11pt;
      color: #334155;
      margin-bottom: 8px;
    }
    .message-avatar {
      display: inline-block;
      width: 18px;
      height: 18px;
      background-color: #4f46e5;
      color: #ffffff;
      text-align: center;
      font-weight: bold;
      margin-right: 6px;
    }
    .message-content {
      font-size: 10.5pt;
      color: #1e293b;
    }
    pre, code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9.5pt;
      background-color: #f1f5f9;
    }
    pre {
      padding: 10px;
      border: 1pt solid #cbd5e1;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1pt solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    blockquote {
      border-left: 3pt solid #cbd5e1;
      margin-left: 0;
      padding-left: 10px;
      color: #475569;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div class="chat-title">${escapeHtml(title || 'AI Chat Export')}</div>
    <div class="meta-info">Exported from ${escapeHtml(platform)} • ${formattedDate}</div>
  </div>
  ${formattedMessages}
</body>
</html>`;
  }

  getFileExtension() {
    return 'doc';
  }

  getMimeType() {
    return 'application/msword';
  }
}
