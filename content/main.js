// Static imports for parsers
import { ChatGPTParser } from './parsers/chatgpt.js';
import { GeminiParser } from './parsers/gemini.js';
import { ClaudeParser } from './parsers/claude.js';
import { QwenParser } from './parsers/qwen.js';
import { PerplexityParser } from './parsers/perplexity.js';
import { DeepSeekParser } from './parsers/deepseek.js';
import { MetaParser } from './parsers/meta.js';
import { MistralParser } from './parsers/mistral.js';
import { GoogleSearchAIParser } from './parsers/google_search_ai.js';
import { ZAiParser } from './parsers/z_ai.js';
import { GeminiCloudAssistParser } from './parsers/gemini_cloud_assist.js';

import { MarkdownFormatter } from './formatters/markdown.js';
import { JsonFormatter } from './formatters/json.js';
import { HtmlFormatter } from './formatters/html.js';

console.log('AI Chat Exporter script loaded');

// Registry of available parsers
const parsers = [
  new ChatGPTParser(),
  new GeminiParser(),
  new ClaudeParser(),
  new QwenParser(),
  new PerplexityParser(),
  new DeepSeekParser(),
  new MetaParser(),
  new MistralParser(),
  new GoogleSearchAIParser(),
  new ZAiParser(),
  new GeminiCloudAssistParser(),
];

// Registry of formatters
const formatters = {
  markdown: new MarkdownFormatter(),
  json: new JsonFormatter(),
  html: new HtmlFormatter(),
};

function stripImages(content) {
  if (!content) return '';
  // 1. Remove markdown images
  let cleaned = content.replace(/!\[.*?\]\(.*?\)/g, '');

  // 2. Clean up leftover bullet points that are now empty
  cleaned = cleaned.replace(/^\s*[-*+]\s*$/gm, '');

  // 3. Remove **Images:** header if it has no bullets under it
  cleaned = cleaned.replace(/\*\*Images:\*\*\s*(?=\*\*|$)/gi, '');

  // 4. Remove **Attachments & Images:** section if it has no remaining attachments
  const attachmentSectionIndex = cleaned.indexOf('**Attachments & Images:**');
  if (attachmentSectionIndex !== -1) {
    const afterHeader = cleaned.slice(attachmentSectionIndex + '**Attachments & Images:**'.length);
    if (!/- \S/g.test(afterHeader)) {
      cleaned = cleaned.slice(0, attachmentSectionIndex);
    }
  }

  // 5. Collapse consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

let activeParser = null;

function detectParser() {
  const currentUrl = window.location.href;
  console.log('Detecting parser for URL:', currentUrl);
  activeParser = parsers.find((p) => p.isAvailable(currentUrl));
  if (activeParser) {
    console.log('[AI Exporter] Active parser:', activeParser.constructor.name);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CHECK_AVAILABILITY') {
    detectParser(); // Re-check in case URL changed

    if (activeParser) {
      // Perform a parse to get the message count
      // return true to indicate async response
      (async () => {
        try {
          const conversation = await activeParser.parse({ full: false });
          console.log('Parsed conversation with', conversation.messages.length, 'messages');
          sendResponse({
            available: true,
            platform: activeParser.constructor.name.replace('Parser', ''),
            count: conversation.messages.length,
            title: conversation.title || '',
          });
        } catch (e) {
          console.error('Check availability parse failed:', e);
          sendResponse({
            available: true,
            platform: activeParser.constructor.name.replace('Parser', ''),
            count: 0, // Fallback
            title: '',
          });
        }
      })();
      return true;
    } else {
      sendResponse({ available: false });
    }
  }

  if (request.action === 'EXPORT_CHAT') {
    if (!activeParser) {
      sendResponse({ success: false, error: 'No parser available' });
      return true;
    }

    const formatter = formatters[request.format];
    if (!formatter) {
      sendResponse({ success: false, error: 'Invalid format' });
      return true;
    }

    (async () => {
      try {
        const conversation = await activeParser.parse({ full: true });
        if (request.includeImages === false) {
          conversation.messages.forEach((msg) => {
            if (msg.content) {
              msg.content = stripImages(msg.content);
            }
          });
        }
        console.log('Parsed conversation with', conversation.messages.length, 'messages');
        const content = formatter.format(conversation);
        const blob = new Blob([content], { type: formatter.getMimeType() });

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        let downloadName;
        if (request.customFilename && request.customFilename.trim().length > 0) {
          const userCustom = request.customFilename.trim().replace(/[\\/:*?"<>|]/g, '');
          downloadName = userCustom.endsWith(`.${formatter.getFileExtension()}`)
            ? userCustom
            : `${userCustom}.${formatter.getFileExtension()}`;
        } else {
          const platformName = activeParser.constructor.name.replace('Parser', '');
          const safeTitle = (conversation.title || 'Untitled_Chat')
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, '_');
          downloadName = `${platformName}-${safeTitle}.${formatter.getFileExtension()}`;
        }

        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        sendResponse({ success: true });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true; // Indicates async response
  }

  if (request.action === 'COPY_CHAT') {
    if (!activeParser) {
      sendResponse({ success: false, error: 'No parser available' });
      return true;
    }

    const formatter = formatters[request.format];
    if (!formatter) {
      sendResponse({ success: false, error: 'Invalid format' });
      return true;
    }

    (async () => {
      try {
        const conversation = await activeParser.parse();
        if (request.includeImages === false) {
          conversation.messages.forEach((msg) => {
            if (msg.content) {
              msg.content = stripImages(msg.content);
            }
          });
        }
        console.log('Parsed conversation with', conversation.messages.length, 'messages');
        sendResponse({
          success: true,
          content: formatter.format(conversation),
        });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }
});

// Initial detection
detectParser();
