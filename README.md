# AI Chat Exporter

A simple, privacy-focused browser extension to export AI chats from ChatGPT,
Claude, Gemini, Qwen, Perplexity, DeepSeek, Meta AI, and Z.ai to Markdown or JSON.

### Quick Install

- 🦊 **Firefox**: [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/ai-chat-export/)
- 🌐 **Chrome / Brave / Opera / Microsoft Edge**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/cgakhbhkplndjjknhgegfcipffflcaoj)
- 🌀 **Microsoft Edge**: [Install from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/hbgckjgfhnaedlihmkogenclfcnobicg). Note that the Edge extension from the official store might be outdated as Microsoft often takes forever to approve.

> [!NOTE]
> **Limitations in Web Store Builds (Chrome & Edge):**
> Due to strict Web Store policies on remotely-hosted code, the pre-built versions published to both the Chrome Web Store and Microsoft Edge Add-ons store **lack KaTeX math equations rendering** for HTML exports.
>
> If you need math equation rendering, you can simply use the **Firefox** extension (which supports KaTeX out of the box from the store), or manually install the full-featured `.zip` package for **Chromium** (see instructions below).

<details>
<summary><b>🛠️ Manual / Offline Installation for Chromium (Full-Featured / KaTeX support)</b></summary>

If you want the full-featured version on Chrome/Edge/Brave:

1. Download the latest `ai-chat-exporter-chromium.zip` from the [Releases page](https://github.com/Rat-S/ai-chat-exporter/releases).
2. Extract the zip file to a folder on your computer.
3. Open your browser and navigate to `chrome://extensions/`.
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** in the top-left and select the extracted folder.

_Note: The developer primarily tests this extension on Firefox. If you experience issues on Chromium, please switch to Firefox or open an issue._

</details>

---

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
  - Z.ai (chat.z.ai)
- **Clean Markdown Export**: Properly formatted with code blocks, tables, and attachments preserved
- **Schema-Based JSON Export**: Normalized JSON exports for predictable downstream use
- **One-Click Export**: Simple popup interface for quick exports

## Usage

1. Navigate to any supported AI chat platform
2. Click the AI Chat Exporter icon in your browser toolbar
3. Choose Markdown or JSON, then click "Export Chat" to download the file
4. The file is saved to your Downloads folder with a timestamped filename

## Development

For setup, building from source, and details on project structure, please refer to the [Development Guide](DEVELOPMENT.md).

## Privacy

AI Chat Exporter does not collect, store, or transmit any personal data.
See [PRIVACY.md](docs/privacy.html) for details.

## License

This Source Code Form is subject to the terms of the Mozilla Public License,
v. 2.0. See [LICENSE](LICENSE) for the full license text.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Acknowledgments

- Uses [Turndown.js](https://github.com/mixmark-io/turndown) for HTML to Markdown conversion.

---

---

> Nota bene: This extension was developed for personal use and is not very polished. Additionally, formatting of exported items from certain chats is currently not working well.
