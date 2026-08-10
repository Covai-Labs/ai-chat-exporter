import { defineConfig } from 'wxt';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  zip: {
    artifactTemplate: '{{name}}-{{browser}}.zip',
  },
  hooks: {
    'zip:start': (wxt) => {
      if (wxt.config.browser === 'chrome') {
        wxt.config.zip.artifactTemplate = '{{name}}-chromium.zip';
      }
    },
  },
  vite: () => ({
    define: {
      __KATEX_CSS__: JSON.stringify(
        fs.readFileSync(path.resolve('content/lib/katex/katex.min.css'), 'utf8'),
      ),
      __KATEX_JS__: JSON.stringify(
        fs.readFileSync(path.resolve('content/lib/katex/katex.min.js'), 'utf8'),
      ),
      __AUTO_RENDER_JS__: JSON.stringify(
        fs.readFileSync(path.resolve('content/lib/katex/auto-render.min.js'), 'utf8'),
      ),
      __PRISM_CSS__: JSON.stringify(
        fs.readFileSync(path.resolve('content/lib/prismjs/prism-tomorrow.min.css'), 'utf8'),
      ),
      __PRISM_JS__: JSON.stringify(
        fs.readFileSync(path.resolve('content/lib/prismjs/prism-bundle.js'), 'utf8'),
      ),
    },
    plugins: [
      {
        name: 'escape-non-printable-utf8',
        generateBundle(_options, bundle) {
          for (const file of Object.values(bundle)) {
            if (file.type === 'chunk' && file.code) {
              file.code = file.code.replace(/[\uFDD0-\uFDEF\uFFFE\uFFFF]/g, (match) => {
                return '\\u' + match.charCodeAt(0).toString(16).padStart(4, '0');
              });
            }
          }
        },
      },
    ],
  }),
  manifestVersion: 3,
  manifest: ({ browser }) => {
    const isFirefox = browser === 'firefox';

    const permissions = ['activeTab', 'scripting', 'storage'];
    if (!isFirefox) {
      permissions.push('sidePanel');
    }

    const hostPermissions = [
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
      '*://copilot.microsoft.com/*',
      '*://www.copilot.microsoft.com/*',
      '*://copilot.com/*',
      '*://www.copilot.com/*',
      '*://lumo.proton.me/*',
    ];

    const baseManifest: any = {
      name: 'AI Chat Exporter - Free, Private, OpenSource',
      description: 'Export AI chats from ChatGPT, Claude, Gemini & more to Markdown or JSON.',
      homepage_url: 'https://ai-chat-exporter.covai.org/',
      permissions,
      host_permissions: hostPermissions,
      action: {
        default_popup: 'entrypoints/popup/index.html',
        default_icon: {
          '16': 'icons/icon16.png',
          '48': 'icons/icon48.png',
          '128': 'icons/icon128.png',
        },
      },
      icons: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
      options_ui: {
        page: 'entrypoints/options/index.html',
        open_in_tab: true,
      },
      web_accessible_resources: [
        {
          resources: [
            'content/chatgpt_helper.js',
            'content/claude_react_reader.js',
            'content/lib/*',
            'schemas/*',
          ],
          matches: hostPermissions,
        },
      ],
    };

    if (!isFirefox) {
      baseManifest.side_panel = {
        default_path: 'entrypoints/sidepanel/index.html',
      };
    }

    if (isFirefox) {
      baseManifest.browser_specific_settings = {
        gecko: {
          id: 'ai-chat-exporter@local.dev',
          strict_min_version: '143.0',
          data_collection_permissions: {
            required: ['none'],
          },
        },
      };
    }

    return baseManifest;
  },
});
