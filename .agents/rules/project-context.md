---
trigger: always_on
---

# Project: AI Chat Exporter Extension

## Core Purpose
This workspace is for developing a browser extension that enables users to export conversations from AI platforms (Gemini, ChatGPT, etc.) into multiple formats, primarily Markdown.

## Workspace & Repository Setup
* **Repository:** Public GitHub repository (`https://github.com/Rat-S/ai-chat-exporter.git`) containing extension source code and build logic.

## Technical Context
* **Platform:** Web Extension (Manifest V3).
* **Target Sites:** gemini.google.com, chatgpt.com, claude.ai, qwen.ai, perplexity.ai, deepseek.com, meta.ai, mistral.ai, console.cloud.google.com/gemini.
* **Primary Feature:** DOM parsing of chat interfaces to extract text, code blocks, and metadata.
* **Export Formats:** Markdown (.md), JSON, and Plain Text (.txt).
* **Firefox Extension ID:** `ai-chat-exporter@local.dev` (registered on Firefox AMO).

## Build & Packaging
* **Build Command:** Run `chmod +x build.sh && ./build.sh` inside the `publish` directory.
  * Can build for specific targets: `./build.sh firefox` or `./build.sh chromium`.
* **Manifest Modifier:** `build.py` handles customizing the `manifest.json` dynamically for each browser target (such as background scripts and type-module loading workarounds).

## CI/CD & Automated Publishing
* **GitHub Actions Workflow:** `.github/workflows/build.yml` runs inside the GitHub repository.
* **Flow:** Pushing a version tag (e.g. `v1.0.9`) does the following:
  1. Builds and creates a GitHub Release draft containing Chromium and Firefox `.zip` assets.
  2. Runs `npx web-ext sign` using stored secrets `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` to automatically upload and publish the update directly to the Firefox Add-ons (AMO) store.

## Test Suite
* **Execution:** Run `npm test` inside the `publish` directory (runs `node --test tests/*.test.*`).
* **Validation Command:** Run `npm run lint && npm run format:check && npm test` to verify linting, formatting, and tests before committing/pushing.
* Covers high-fidelity DOM snapshot parsing for all target sites (ChatGPT, Gemini, Claude, DeepSeek, Meta, Mistral, Perplexity, Qwen, Gemini Cloud Assist), lazy scroll collectors, copy actions, and markdown utilities.

## Project Structure
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

## Development Guidelines
* **Git Push Restriction (CRITICAL):** AI agents must NEVER push changes to GitHub or GitLab repositories without explicit user consent.
* **Versioning Policy:** Adhere to Semantic Versioning (SemVer) for all future version bumps and tags (e.g., `v1.1.3`), even though SemVer was not consistently followed in the past.
* **DOM Resilience:** When writing content scripts, prioritize robust selectors (like ARIA labels) over brittle CSS classes that may change frequently.
* **Markdown Formatting:** Ensure LaTeX equations are properly escaped for compatibility with common Markdown viewers (e.g., using `$` or `$$`).
* **UI/UX:** The extension popup should be clean and minimalist.
* **Browser Help:** Since this is a browser extension, ask the user for console logs or manual behavior checks when testing new features.