<div align="center">

# AI Chat Exporter

**Export, back up, and transfer AI conversations to Markdown, JSON, HTML, Word (.doc), and PNG — 100% locally.**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/cgakhbhkplndjjknhgegfcipffflcaoj?label=Chrome%20Web%20Store&color=blue)](https://chromewebstore.google.com/detail/ai-chat-exporter-free-pri/cgakhbhkplndjjknhgegfcipffflcaoj)
[![Firefox Add-ons](https://img.shields.io/amo/v/ai-chat-export?label=Firefox%20Add-ons&color=orange)](https://addons.mozilla.org/en-US/firefox/addon/ai-chat-export/)
[![Microsoft Edge](https://img.shields.io/github/package-json/v/Covai-Labs/ai-chat-exporter?label=Microsoft%20Edge&logo=microsoft-edge&logoColor=white&color=0078D7)](https://microsoftedge.microsoft.com/addons/detail/ai-chat-exporter-free-/hbgckjgfhnaedlihmkogenclfcnobicg)

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](LICENSE)

[![Website](https://img.shields.io/badge/Website-ai--chat--exporter.covai.org-blueviolet)](https://ai-chat-exporter.covai.org/)

[Quick Install](#-quick-install) • [Supported Platforms](#-supported-platforms) • [Features](#-key-features) • [Local Development](#-local-development)

---

[![Watch Demo Video](https://img.youtube.com/vi/5V2EZqDkUnU/maxresdefault.jpg)](https://www.youtube.com/watch?v=5V2EZqDkUnU)

<sub>▶️ **Click to watch:** 1-minute walkthrough of chat continuation, selective export, preview themes, and PNG downloads.</sub>

</div>

---

## 🔒 Why AI Chat Exporter? (Privacy First)

Most AI exporters and extensions send your chat history or API calls to third-party backend servers for conversion.

**AI Chat Exporter is 100% local:**

- **Zero Remote Processing:** All DOM extraction, markdown generation, LaTeX parsing, and image rendering occur entirely inside your local browser.
- **Zero Telemetry / Zero Tracking:** No analytics, no trackers, no external logging, and no remote dependencies.
- **Your Data Remains Yours:** Chat threads, custom instructions, and exported files never leave your machine.

---

## ✨ Key Features

- **📝 Clean Markdown with Math & Code:**
  - Preserves syntax highlighting, code languages, tables, and nested lists.
  - Standardizes LaTeX math formatting (`$$...$$` block and `$...$` inline) without broken backslashes. Ready for **Obsidian**, **Logseq**, and **Notion**.
- **🔄 Cross-Model Chat Continuation:**
  - Hand off active conversations between platforms in a single click (e.g., take a ChatGPT conversation and continue it directly in Claude or Gemini).
- **📓 Direct PKM App Transfer:**
  - Export straight into **Obsidian** via `obsidian://new` URIs, or trigger URL schemes for **Logseq**, **Bear**, **Drafts**, and **NotePlan**.
- **🗂️ Standardized JSON Schema:**
  - Emits structured, normalized chat objects adhering to [Export Schema v1](schemas/export-v1.schema.json) for archiving, backups, and programmatic AI workflows.
- **📸 Built-in Live Preview & Themes:**
  - Interactive preview window supporting Dark, Light, and Solarized themes before downloading.
  - Export high-resolution PNG snapshots of conversations or selective turns.
- **📋 Smart Dual-MIME Copy:**
  - One-click copy that places both clean Markdown and rich HTML on your clipboard simultaneously for seamless pasting into emails, Google Docs, or Word.
- **📄 Word (.doc) & PDF Support:**
  - Export formatted Word-compatible documents or print-ready PDF files with complete math rendering.
- **⚡ Chromium Side Panel Support:**
  - View exports, preview documents, and trigger continuation straight from the native browser side panel without leaving your active tab.

---

## 🌐 Supported Platforms

AI Chat Exporter extracts full conversation threads from all major AI chat platforms, AI search overviews, and web articles. Context continuation allows you to hand off conversations directly to leading LLMs and PKM note-taking apps.

| Platform                                                      | Markdown | JSON | HTML / Doc / PNG | Continuation Target |
| :------------------------------------------------------------ | :------: | :--: | :--------------: | :-----------------: |
| **[ChatGPT](https://chatgpt.com)**                            |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Claude](https://claude.ai)**                               |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Google Gemini](https://gemini.google.com)**                |    ✅    |  ✅  |        ✅        |         ✅          |
| **[DeepSeek](https://chat.deepseek.com)**                     |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Microsoft Copilot](https://copilot.microsoft.com)**        |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Perplexity](https://www.perplexity.ai)**                   |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Qwen](https://chat.qwenlm.ai)**                            |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Mistral / Le Chat](https://chat.mistral.ai)**              |    ✅    |  ✅  |        ✅        |         ✅          |
| **[Google Search AI (AI Overviews)](https://www.google.com)** |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Google AI Studio](https://aistudio.google.com)**           |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Google Cloud Assist](https://console.cloud.google.com)**   |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[NotebookLM](https://notebooklm.google.com)**               |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Meta AI](https://www.meta.ai)**                            |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Proton Lumo](https://lumo.proton.me)**                     |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Z.ai](https://z.ai)**                                      |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Joyland](https://www.joyland.ai)**                         |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **[Chub AI](https://chub.ai)**                                |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |
| **Generic Web Articles**                                      |    ✅    |  ✅  |        ✅        |  — _(Export only)_  |

> **Continuation Targets:** Seamless prompt injection is supported for general-purpose chat models (ChatGPT, Claude, Gemini, DeepSeek, Copilot, Perplexity, Qwen, Mistral) and PKM note-taking apps (**Obsidian**, **Logseq**, **Bear**, **NotePlan**, **Drafts**). Platforms requiring character selection (Joyland, Chub AI) or workspace setup (NotebookLM) are supported for clean export only.

---

## 🚀 Quick Install

### Official Stores

- 🦊 **Firefox**: [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/ai-chat-export/)
- 🌐 **Chrome / Brave**: [Install from Chrome Web Store](https://chromewebstore.google.com/detail/ai-chat-exporter-free-pri/cgakhbhkplndjjknhgegfcipffflcaoj)
- 🌊 **Microsoft Edge**: [Install from Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/ai-chat-exporter-free-/hbgckjgfhnaedlihmkogenclfcnobicg)

> [!NOTE]
> Chrome Web Store updates may occasionally lag behind Firefox and GitHub releases due to store review queues.

<details>
<summary><b>📦 Manual / Unpacked Installation</b></summary>

#### Chrome / Edge / Brave / Chromium

1. Download the latest `ai-chat-exporter-chromium.zip` from the [Releases page](https://github.com/Covai-Labs/ai-chat-exporter/releases).
2. Extract the zip file to a folder on your computer.
3. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`).
4. Enable **Developer mode** using the toggle switch in the top-right corner.
5. Click **Load unpacked** and select the extracted folder.

#### Firefox

1. Download the latest `ai-chat-exporter-firefox.zip` from the [Releases page](https://github.com/Covai-Labs/ai-chat-exporter/releases).
2. Extract the zip file to a folder on your computer.
3. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
4. Click **Load Temporary Add-on...**
5. Select `manifest.json` inside the extracted folder.

</details>

---

## 🛠️ Local Development

Contributions are welcome! If an AI chat interface updates its DOM or you want to add support for a new platform, follow these steps:

```bash
# 1. Clone the repository
git clone https://github.com/Covai-Labs/ai-chat-exporter.git
cd ai-chat-exporter

# 2. Install dependencies
npm install

# 3. Start development mode with auto-reload
npm run dev

# 4. Build extension bundle for production
npm run build          # Builds Chromium (Chrome/Edge/Brave) into .output/chrome-mv3
npm run build:firefox  # Builds Firefox MV3 into .output/firefox-mv3

# 5. Run automated test suite and linter
npm test
npm run lint
npm run format:check
```

### Loading Unpacked Build

- **Chromium:** Load the `.output/chrome-mv3` folder at `chrome://extensions/`.
- **Firefox:** Load `.output/firefox-mv3/manifest.json` at `about:debugging#/runtime/this-firefox`.

For complete architectural details, parser guidelines, and test harnesses, refer to the [Development Guide](DEVELOPMENT.md).

---

## 🤝 Contributing

Platform web layouts evolve frequently. If an exporter encounters issues on a modified layout:

1. Check existing [Issues](https://github.com/Covai-Labs/ai-chat-exporter/issues) or open a new one with the platform name and DOM context.
2. Submit a Pull Request following our [Contribution Guidelines](CONTRIBUTING.md).

---

## 📄 License

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. See [LICENSE](LICENSE) for the full license text.

---

## 🙏 Acknowledgments

- [decant-core](https://github.com/Covai-Labs/decant-core) — Shared parser engine and intelligent article extraction.
- [Turndown.js](https://github.com/mixmark-io/turndown) — HTML to Markdown conversion.
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitization.
- [html2canvas](https://github.com/niklasvh/html2canvas) — Client-side PNG rendering.
- [KaTeX](https://github.com/KaTeX/KaTeX) — Math and LaTeX equation rendering.
- [Prism.js](https://github.com/PrismJS/prism) — Code block syntax highlighting.
- [WXT](https://wxt.dev/) — Extension development framework.
