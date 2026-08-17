import { ExportFormatter } from './base.js';

export function normalizeLatexMath(text) {
  if (!text || typeof text !== 'string') return '';

  const placeholders = [];
  let tokenCounter = 0;

  // 1. Protect fenced code blocks (``` ... ``` or ~~~ ... ~~~)
  let processed = text.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
    const id = `@@MATH_CODE_BLOCK_${tokenCounter++}@@`;
    placeholders.push({ id, content: match });
    return id;
  });

  // 2. Protect inline code (`...`)
  processed = processed.replace(/`([^`\n]+?)`/g, (match) => {
    const id = `@@MATH_INLINE_CODE_${tokenCounter++}@@`;
    placeholders.push({ id, content: match });
    return id;
  });

  // 3. Convert display math: \[ ... \] or \\[ ... \\]
  processed = processed.replace(/(?:\\{1,2}\[)([\s\S]+?)(?:\\{1,2}\])/g, (match, math) => {
    return `$$${math.trim()}$$`;
  });

  // 4. Convert inline math: \( ... \) or \\( ... \\)
  processed = processed.replace(/(?:\\{1,2}\()([\s\S]+?)(?:\\{1,2}\))/g, (match, math) => {
    return `$${math.trim()}$`;
  });

  // 5. Restore protected code blocks & inline code
  placeholders.forEach(({ id, content }) => {
    processed = processed.replace(id, () => content);
  });

  return processed;
}

export class MarkdownFormatter extends ExportFormatter {
  format(conversation) {
    const { title, messages } = conversation;
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;

    let output = `# ${title || 'AI Chat Export'}\n\n`;

    output += `**Exported with:** [AI Chat Exporter](https://ai-chat-exporter.covai.org)  \n`;

    const metadata = conversation.metadata || {};
    const platform = metadata.Source || 'AI';
    const date = metadata.Date || formattedDate;
    const link = conversation.url || metadata.Link || '';
    const model = metadata.Model;

    output += `**Source:** ${platform}  \n`;
    output += `**Date:** ${date}  \n`;

    if (link) {
      output += `**Link:** [${link}](${link})  \n`;
    }

    if (model) {
      output += `**Model:** ${model}  \n`;
    }

    const standardKeys = new Set(['Source', 'Date', 'Link', 'Model']);
    Object.entries(metadata).forEach(([key, value]) => {
      if (!standardKeys.has(key) && value) {
        if (typeof value === 'string' && value.startsWith('http')) {
          output += `**${key}:** [${value}](${value})  \n`;
        } else {
          output += `**${key}:** ${value}  \n`;
        }
      }
    });

    output += `\n`;

    messages.forEach((msg, index) => {
      // Use "Prompt:" for user, "Response:" for model
      const heading = msg.role === 'User' ? '## Prompt:' : '## Response:';
      output += `${heading}\n`;
      output += `${normalizeLatexMath(msg.content)}\n\n`;

      // Don't add separator after last message
      if (index < messages.length - 1) {
        // No separator needed - just blank line between messages
      }
    });

    return output;
  }

  getFileExtension() {
    return 'md';
  }

  getMimeType() {
    return 'text/markdown';
  }
}
