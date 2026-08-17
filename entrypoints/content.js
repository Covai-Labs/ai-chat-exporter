import { ChatGPTParser } from '../content/parsers/chatgpt.js';
import { GeminiParser } from '../content/parsers/gemini.js';
import { ClaudeParser } from '../content/parsers/claude.js';
import { QwenParser } from '../content/parsers/qwen.js';
import { PerplexityParser } from '../content/parsers/perplexity.js';
import { DeepSeekParser } from '../content/parsers/deepseek.js';
import { MetaParser } from '../content/parsers/meta.js';
import { MistralParser } from '../content/parsers/mistral.js';
import { GoogleSearchAIParser } from '../content/parsers/google_search_ai.js';
import { ZAiParser } from '../content/parsers/z_ai.js';
import { GeminiCloudAssistParser } from '../content/parsers/gemini_cloud_assist.js';
import { GoogleAIStudioParser } from '../content/parsers/google_ai_studio.js';
import { NotebookLMParser } from '../content/parsers/notebooklm.js';
import { CopilotParser } from '../content/parsers/copilot.js';
import { LumoParser } from '../content/parsers/lumo.js';

import { MarkdownFormatter } from '../content/formatters/markdown.js';
import { JsonFormatter } from '../content/formatters/json.js';
import { HtmlFormatter } from '../content/formatters/html.js';
import { ImageFormatter } from '../content/formatters/image.js';
import { ContinuationFormatter } from '../content/formatters/continuation.js';
import { DocFormatter } from '../content/formatters/doc.js';

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://gemini.google.com/*',
    '*://claude.ai/*',
    '*://qwen.ai/*',
    '*://chat.qwen.ai/*',
    '*://www.perplexity.ai/*',
    '*://chat.deepseek.com/*',
    '*://www.meta.ai/*',
    '*://meta.ai/*',
    '*://chat.mistral.ai/*',
    '*://chat.z.ai/*',
    '*://console.cloud.google.com/*',
    '*://aistudio.google.com/*',
    '*://notebooklm.google.com/*',
    '*://notebook.google.com/*',
    '*://copilot.microsoft.com/*',
    '*://www.copilot.microsoft.com/*',
    '*://copilot.com/*',
    '*://www.copilot.com/*',
    '*://copilot.cloud.microsoft/*',
    '*://www.bing.com/chat*',
    '*://www.bing.com/copilot*',
    '*://www.bing.com/copilotsearch*',
    '*://bing.com/chat*',
    '*://bing.com/copilot*',
    '*://bing.com/copilotsearch*',
    '*://edgeservices.bing.com/*',
    '*://lumo.proton.me/*',
    '*://www.google.com/*',
    '*://www.google.co.in/*',
    '*://www.google.co.uk/*',
    '*://www.google.ca/*',
    '*://www.google.com.au/*',
    '*://www.google.de/*',
    '*://www.google.fr/*',
  ],
  runAt: 'document_idle',
  main() {
    console.log('AI Chat Exporter content script loaded via WXT');

    const continuationFormatter = new ContinuationFormatter();

    async function checkAndInjectContinuation() {
      try {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
        const res = await chrome.storage.local.get('pendingContinuation');
        const data = res?.pendingContinuation;
        if (!data || !data.payload) return;

        // Expire pending continuation after 5 minutes
        if (Date.now() - (data.timestamp || 0) > 300000) {
          await chrome.storage.local.remove('pendingContinuation');
          return;
        }

        const inputSelectors = [
          '#prompt-textarea',
          'div[contenteditable="true"]',
          'textarea',
          '.user-prompt textarea',
          'ms-prompt-editor textarea',
        ];

        let inputEl = null;
        for (const sel of inputSelectors) {
          inputEl = document.querySelector(sel);
          if (inputEl) break;
        }

        if (inputEl) {
          if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
            inputEl.value = data.payload;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            inputEl.textContent = data.payload;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          }

          await chrome.storage.local.remove('pendingContinuation');
          console.log('[AI Exporter] Auto-injected transferred conversation context.');
        }
      } catch (e) {
        console.warn('[AI Exporter] Continuation injection check failed:', e);
      }
    }

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
      new GoogleAIStudioParser(),
      new NotebookLMParser(),
      new CopilotParser(),
      new LumoParser(),
    ];

    const formatters = {
      markdown: new MarkdownFormatter(),
      json: new JsonFormatter(),
      html: new HtmlFormatter(),
      png: new ImageFormatter(),
      doc: new DocFormatter(),
    };

    async function ensureHtml2CanvasLoaded() {
      if (typeof window !== 'undefined' && window.html2canvas) return;
      try {
        const scriptUrl = chrome.runtime.getURL('content/lib/html2canvas.min.js');
        await import(scriptUrl);
      } catch (e) {
        console.warn(
          '[AI Exporter] Dynamic import of html2canvas failed, attempting script injection:',
          e,
        );
        return new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = chrome.runtime.getURL('content/lib/html2canvas.min.js');
          s.onload = resolve;
          s.onerror = reject;
          (document.head || document.documentElement).appendChild(s);
        });
      }
    }

    function stripImages(content) {
      if (!content) return '';
      let cleaned = content.replace(/!\[.*?\]\(.*?\)/g, '');
      cleaned = cleaned.replace(/^\s*[-*+]\s*$/gm, '');
      cleaned = cleaned.replace(/\*\*Images:\*\*\s*(?=\*\*|$)/gi, '');
      const attachmentSectionIndex = cleaned.indexOf('**Attachments & Images:**');
      if (attachmentSectionIndex !== -1) {
        const afterHeader = cleaned.slice(
          attachmentSectionIndex + '**Attachments & Images:**'.length,
        );
        if (!/- \S/g.test(afterHeader)) {
          cleaned = cleaned.slice(0, attachmentSectionIndex);
        }
      }
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

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'CHECK_AVAILABILITY') {
          detectParser();
          if (activeParser) {
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
                  count: 0,
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
            detectParser();
          }
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
              const conversation = await activeParser.parse({
                full: true,
                parserMode: request.parserMode || 'auto',
                includeImages: request.includeImages !== false,
              });
              if (request.includeImages === false) {
                conversation.messages.forEach((msg) => {
                  if (msg.content) {
                    msg.content = stripImages(msg.content);
                  }
                });
              }
              if (request.format === 'png') {
                await ensureHtml2CanvasLoaded();
              }
              const options = { highQuality: request.highQualityPng !== false };
              const formattedResult = await formatter.format(conversation, options);
              const mimeType = formatter.getMimeType();
              const blob =
                formattedResult instanceof Blob
                  ? formattedResult
                  : new Blob(
                      formatter.getFileExtension() === 'doc'
                        ? ['\ufeff', formattedResult]
                        : [formattedResult],
                      { type: `${mimeType};charset=utf-8` },
                    );

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
          return true;
        }

        if (request.action === 'COPY_CHAT') {
          if (!activeParser) {
            detectParser();
          }
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
              const conversation = await activeParser.parse({
                full: true,
                parserMode: request.parserMode || 'auto',
                includeImages: request.includeImages !== false,
              });
              if (request.includeImages === false) {
                conversation.messages.forEach((msg) => {
                  if (msg.content) {
                    msg.content = stripImages(msg.content);
                  }
                });
              }
              console.log('Parsed conversation with', conversation.messages.length, 'messages');
              const primaryContent = formatter.format(conversation);
              const htmlFormatter = formatters.html;
              const richHtmlContent = htmlFormatter ? htmlFormatter.format(conversation) : null;

              sendResponse({
                success: true,
                content: primaryContent,
                htmlContent: richHtmlContent,
                conversation: conversation,
              });
            } catch (e) {
              console.error(e);
              sendResponse({ success: false, error: e.message });
            }
          })();
          return true;
        }

        if (request.action === 'GET_CONTINUATION_PAYLOAD') {
          if (!activeParser) {
            sendResponse({ success: false, error: 'No parser available' });
            return true;
          }

          (async () => {
            try {
              const conversation = await activeParser.parse({
                full: true,
                parserMode: request.parserMode || 'auto',
                includeImages: request.includeImages !== false,
              });
              if (request.includeImages === false) {
                conversation.messages.forEach((msg) => {
                  if (msg.content) {
                    msg.content = stripImages(msg.content);
                  }
                });
              }
              const platformName = activeParser.constructor.name.replace('Parser', '');
              conversation.metadata = { ...conversation.metadata, Source: platformName };
              const payload = continuationFormatter.format(conversation, request.instruction || '');

              sendResponse({ success: true, payload });
            } catch (e) {
              console.error(e);
              sendResponse({ success: false, error: e.message });
            }
          })();
          return true;
        }
      });
    }

    detectParser();
    checkAndInjectContinuation();
  },
});
