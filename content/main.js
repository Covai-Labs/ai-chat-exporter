// Static imports for parsers
import { ChatGPTParser } from './parsers/chatgpt.js';
import { GeminiParser } from './parsers/gemini.js';
import { ClaudeParser } from './parsers/claude.js';
import { QwenParser } from './parsers/qwen.js';
import { PerplexityParser } from './parsers/perplexity.js';
import { DeepSeekParser } from './parsers/deepseek.js';
import { MetaParser } from './parsers/meta.js';
import { MistralParser } from './parsers/mistral.js';

import { MarkdownFormatter } from './formatters/markdown.js';

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
    new MistralParser()
];

// Registry of formatters
const formatters = {
    'markdown': new MarkdownFormatter()
};

let activeParser = null;

function detectParser() {
    const currentUrl = window.location.href;
    console.log('Detecting parser for URL:', currentUrl);
    activeParser = parsers.find(p => p.isAvailable(currentUrl));
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
                    const conversation = await activeParser.parse();
                    console.log('Parsed conversation with', conversation.messages.length, 'messages');
                    sendResponse({
                        available: true,
                        platform: activeParser.constructor.name.replace('Parser', ''),
                        count: conversation.messages.length
                    });
                } catch (e) {
                    console.error('Check availability parse failed:', e);
                    sendResponse({
                        available: true,
                        platform: activeParser.constructor.name.replace('Parser', ''),
                        count: 0 // Fallback
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
                const conversation = await activeParser.parse();
                console.log('Parsed conversation with', conversation.messages.length, 'messages');
                const content = formatter.format(conversation);
                const blob = new Blob([content], { type: formatter.getMimeType() });

                // Trigger download (simplest way from content script is usually creating a link)
                // Alternatively, send data back to background to download (better for filenames)
                // For now, let's try direct download link injection
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Get platform name from parser
                const platformName = activeParser.constructor.name.replace('Parser', '');
                // Sanitize filename: replace spaces with underscores, keep dots/dashes, remove unsafe chars
                const safeTitle = conversation.title
                    .replace(/[\\/:*?"<>|]/g, '') // Remove invalid chars
                    .replace(/\s+/g, '_');         // Replace spaces with underscores
                a.download = `${platformName}-${safeTitle}.${formatter.getFileExtension()}`;
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
                console.log(
                    'Parsed conversation with',
                    conversation.messages.length,
                    'messages'
                );
                sendResponse({
                    success: true,
                    content: formatter.format(conversation)
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
