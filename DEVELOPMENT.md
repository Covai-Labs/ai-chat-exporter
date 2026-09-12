# AI Chat Exporter - Development Guide

This guide covers setting up, building, and contributing to the AI Chat Exporter extension.

## Prerequisites

- **Node.js 20+** with npm

## Development

### Install dependencies

```bash
npm install
```

### Run in development mode with auto-reload

```bash
npm run dev
```

Opens a Chromium browser with the extension loaded and hot-reload.

### Build production bundles

```bash
npm run build          # Chromium (Chrome, Edge, Brave) -> .output/chrome-mv3
npm run build:firefox  # Firefox MV3 -> .output/firefox-mv3
```

To create distributable `.zip` archives:

```bash
npm run zip         # .output/*.zip for Chromium targets
npm run zip:firefox # .output/*.zip for Firefox
```

### Load the unpacked build

- **Chromium:** Load the `.output/chrome-mv3` folder at `chrome://extensions/`.
- **Firefox:** Load `.output/firefox-mv3/manifest.json` at `about:debugging#/runtime/this-firefox`.

### Run tests, lint, and formatting

```bash
npm test
npm run lint
npm run format:check
```

### Add or update a platform parser

Platform parsers live in `content/parsers`. If an AI chat interface changes its DOM or you want
to add support for a new platform:

1. Copy an existing parser as a starting point and add it to the parsers registry in `content/main.js`.
2. Add a DOM fixture under `tests/fixtures/` and a matching `tests/<platform>-parser.test.mjs`.
3. Run `npm test && npm run lint && npm run format:check` before committing.

## Project Structure

```
├── entrypoints/          # WXT entry points (background, content script, popup, sidepanel)
├── content/              # Content-script logic
│   ├── parsers/          # Platform-specific AI chat parsers
│   ├── formatters/       # Markdown, JSON, HTML, Image, Doc formatters
│   ├── utils/            # Parser & DOM helpers
│   └── lib/              # Third-party libraries (Turndown, Prism, KaTeX)
├── popup/                # Extension popup UI
├── sidepanel/            # Browser side panel UI (Chromium)
├── options/              # Extension preferences page UI
├── schemas/              # JSON export schemas (v1)
├── tests/                # Node test suite + DOM fixtures
├── public/               # Static assets copied into the build
├── wxt.config.ts         # WXT extension configuration
└── web/                  # Marketing site source (Astro, deploys to docs/)
```

For general information about the extension, installation, and usage, see [README.md](./README.md).
For contribution guidelines and licensing terms, see [CONTRIBUTING.md](./CONTRIBUTING.md).
