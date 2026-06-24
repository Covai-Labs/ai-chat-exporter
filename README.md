# AI Chat Exporter

A simple, privacy-focused browser extension to export AI chats from ChatGPT,
Claude, Gemini, Qwen, Perplexity, DeepSeek, and Meta AI to Markdown or JSON.

> This extension was developed for personal use and is not very polished. Additionally, formatting of exported items from certain chats is currently not working well.

## Features

- **Privacy First**: All processing happens locally in your browser.
  No data is sent to external servers.
- **Multi-Platform Support**: Works with all major AI chat platforms
  - ChatGPT (chatgpt.com)
  - Claude (claude.ai)
  - Gemini (gemini.google.com)
  - Qwen (qwen.ai, chat.qwen.ai)
  - Perplexity (perplexity.ai)
  - DeepSeek (chat.deepseek.com)
  - Meta AI (meta.ai)
- **Clean Markdown Export**: Properly formatted with code blocks, tables, and attachments preserved
- **Schema-Based JSON Export**: Normalized JSON exports for predictable downstream use
- **One-Click Export**: Simple popup interface for quick exports

## Installation

### Firefox

Firefox users can install the extension directly from the [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/ai-chat-export/).

Alternatively, to install it temporarily:

1. Download `ai-chat-exporter-firefox.zip` from the
   [releases page](https://github.com/Rat-S/ai-chat-exporter/releases)
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on..."
4. Select the zip file

### Microsoft Edge

Edge users can install the extension directly from the [Microsoft Edge Add-ons store](https://microsoftedge.microsoft.com/addons/detail/hbgckjgfhnaedlihmkogenclfcnobicg).

### Chrome / Brave / Other Chromium-based browsers (Manual install)

> [!NOTE]
> Please note that the developer does not test this extension with Chromium-based browsers, and it may or may not work.

1. Download `ai-chat-exporter-chromium.zip` from the
   [releases page](https://github.com/Rat-S/ai-chat-exporter/releases)
2. Extract the zip file to a folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top-right corner)
5. Click "Load unpacked" and select the extracted folder

## Usage

1. Navigate to any supported AI chat platform
2. Click the AI Chat Exporter icon in your browser toolbar
3. Choose Markdown or JSON, then click "Export Chat" to download the file
4. The file is saved to your Downloads folder with a timestamped filename

## Development

### Prerequisites

- Python 3.x
- zip utility

### Build

Build for all targets:

```bash
./build.sh
```

Build for specific target:

```bash
./build.sh chromium  # or firefox
```

Output files will be in `releases/` directory.

### Project Structure

```
├── background/          # Service worker / background scripts
├── content/             # Content scripts and parsers
│   ├── parsers/         # Platform-specific chat parsers
│   ├── utils/           # Utility functions
│   └── lib/             # Third-party libraries (Turndown.js)
├── popup/               # Extension popup UI
├── schemas/             # JSON export schemas
├── docs/                # Documentation and privacy policy
├── manifest.json        # Extension manifest (v3)
└── build.sh             # Build script
```

## Privacy

AI Chat Exporter does not collect, store, or transmit any personal data.
See [PRIVACY.md](docs/privacy.html) for details.

## License

This Source Code Form is subject to the terms of the Mozilla Public License,
v. 2.0. See [LICENSE](LICENSE) for the full license text.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

- Uses [Turndown.js](https://github.com/mixmark-io/turndown) for HTML to Markdown conversion
