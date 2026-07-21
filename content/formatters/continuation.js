import { ExportFormatter } from './base.js';

export class ContinuationFormatter extends ExportFormatter {
  format(conversation, customInstruction = '') {
    const { title, messages } = conversation;
    const sourcePlatform = conversation.metadata?.Source || 'AI Platform';

    const formattedMessages = messages
      .map((msg) => {
        const role = msg.role === 'User' ? 'User' : 'Assistant';
        return `[${role}]: ${msg.content}`;
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
