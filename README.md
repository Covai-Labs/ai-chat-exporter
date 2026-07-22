# AI Chat Exporter

A simple, privacy-focused browser extension to export AI chats from ChatGPT, Claude, Gemini, Microsoft Copilot, NotebookLM, Google AI Studio, Qwen, Perplexity, DeepSeek, Meta AI, and Z.ai to Markdown, JSON, HTML, or PNG image.

### Quick Install

- 🦊 **Firefox**: [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/ai-chat-export/)
- 🌐 **Chromium-based browsers**: [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/cgakhbhkplndjjknhgegfcipffflcaoj) _(Chrome, Brave, Edge, Opera, Yandex, Whale, etc.)_
<!-- - 🌀 **Microsoft Edge**: [Install from Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/hbgckjgfhnaedlihmkogenclfcnobicg). Note that the Edge extension from the official store might be outdated as Microsoft often takes forever to approve. -->

> [!NOTE]
> **Limitations in Web Store Builds (Chrome):**
> Due to strict Web Store policies on remotely-hosted code, the pre-built version published to the Chrome Web Store **lacks KaTeX math equations rendering** for HTML exports.
>
> If you need math equation rendering, you can simply use the **Firefox** extension (which supports KaTeX out of the box from the store), or manually install the full-featured `.zip` package for **Chromium** (see instructions below).

<details>
<summary><b>🛠️ Manual / Offline Installation for Chromium (Full-Featured / KaTeX support)</b></summary>

If you want the full-featured version on Chromium-based browsers (Chrome, Edge, Brave, Opera, Yandex, Whale, etc.):

1. Download the latest `ai-chat-exporter-chromium.zip` from the [Releases page](https://github.com/Rat-S/ai-chat-exporter/releases).
2. Extract the zip file to a folder on your computer.
3. Open your browser and navigate to `chrome://extensions/`.
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** in the top-left and select the extracted folder.

_Note: The developer primarily tests this extension on Firefox. If you experience issues on Chromium, please switch to Firefox or open an issue._

</details>

---

## Features

- **Privacy First**: All processing happens locally in your browser. No data is ever sent to third-party servers.
- **Multi-Platform Support**: Works with all major AI chat platforms:
  - ChatGPT (chatgpt.com)
  - Claude (claude.ai)
  - Gemini (gemini.google.com)
  - Google Cloud Assist (console.cloud.google.com/gemini)
  - Google AI Studio (aistudio.google.com)
  - NotebookLM (notebooklm.google.com)
  - Microsoft Copilot (copilot.microsoft.com)
  - DeepSeek (chat.deepseek.com)
  - Qwen (qwen.ai, chat.qwen.ai)
  - Perplexity (perplexity.ai)
  - Meta AI (meta.ai)
  - Z.ai (chat.z.ai)
  - Mistral (chat.mistral.ai)
- **Versatile Export Formats**:
  - **Clean Markdown**: Properly formatted with code blocks, tables, and images preserved.
  - **Structured JSON**: Normalized JSON exports matching a strict JSON schema.
  - **Raw HTML**: Complete chat layout with math equations (supported natively on Firefox / offline build).
  - **Shareable Image (PNG)**: Convert the chat thread into a clean, sharing-ready PNG image using `html2canvas`.
- **Chat Continuation / Transfer**: Move your active chat context directly across platforms (e.g., send your current Claude conversation straight to Gemini or ChatGPT to continue there).
- **Clipboard Rich-Text Copying**: Instantly copy chats to your clipboard with rich-text formatting, perfect for pasting directly into emails, document editors, or notes.
- **Side Panel Support (Chromium Only)**: View exports and run chat context continuation inside your browser's native side panel for a streamlined workflow.
- **Custom Filenames**: Input custom filenames before exporting to keep your downloads structured.
- **One-Click Export**: Quick popup interface for fast exports.

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
- Uses [html2canvas](https://github.com/niklasvh/html2canvas) for generating shareable PNG image exports.
- Uses [KaTeX](https://github.com/KaTeX/KaTeX) for rendering math and LaTeX equations.

---

---

> Nota bene: This extension was developed for personal use and is not very polished. Additionally, formatting of exported items from certain chats may currently not work well due to changes in those chat platforms. You may raise an issue and/or PR.
