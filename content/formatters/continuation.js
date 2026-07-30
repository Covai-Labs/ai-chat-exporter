import { ExportFormatter } from './base.js';

export function stripEncodedImages(content) {
  if (!content) return '';
  // 1. Replace markdown images with base64 data URIs: ![alt](data:image/...) -> [Image: alt]
  let cleaned = content.replace(
    /!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/gi,
    (match, alt) => {
      const label = alt && alt.trim() && !alt.startsWith('http') ? alt.trim() : 'Image';
      return `[${label}]`;
    },
  );

  // 2. Replace standalone base64 data URIs
  cleaned = cleaned.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/gi, '[Image Data]');

  // 3. Clean up consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

export class ContinuationFormatter extends ExportFormatter {
  format(conversation, customInstruction = '') {
    const { title, messages } = conversation;
    const sourcePlatform = conversation.metadata?.Source || 'AI Platform';

    const formattedMessages = messages
      .map((msg) => {
        const role = msg.role === 'User' ? 'User' : 'Assistant';
        const cleanedContent = stripEncodedImages(msg.content);
        return `[${role}]: ${cleanedContent}`;
      })
      .join('\n\n');

    let prompt = `Here is the context of our previous conversation on ${sourcePlatform}${
      title ? ` ("${title}")` : ''
    }:\n\n`;
    prompt += `${formattedMessages}\n\n`;
    prompt += `--- Continuation Instruction ---\n`;
    if (customInstruction && customInstruction.trim().length > 0) {
      prompt += `${customInstruction.trim()}\n`;
    } else {
      prompt += `Please review the conversation history above and continue our conversation from where we left off.\n`;
    }

    return prompt;
  }

  getFileExtension() {
    return 'txt';
  }

  getMimeType() {
    return 'text/plain';
  }
}
