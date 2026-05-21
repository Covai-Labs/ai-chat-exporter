import { ExportFormatter } from './base.js';

export class MarkdownFormatter extends ExportFormatter {
  format(conversation) {
    const { title, messages } = conversation;
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;

    let output = `# ${title || 'AI Chat Export'}\n\n`;

    // Add metadata (timestamp and URL)
    if (conversation.metadata) {
      Object.entries(conversation.metadata).forEach(([key, value]) => {
        output += `**${key}:** ${value}  \n`;
      });
    } else {
      output += `**Exported:** ${formattedDate}  \n`;
      if (conversation.url) {
        output += `**Link:** [${conversation.url}](${conversation.url})\n`;
      }
    }
    output += `\n`;

    messages.forEach((msg, index) => {
      // Use "Prompt:" for user, "Response:" for model
      const heading = msg.role === 'User' ? '## Prompt:' : '## Response:';
      output += `${heading}\n`;
      output += `${msg.content}\n\n`;

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
