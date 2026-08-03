# AI Chat Exporter - Development Guide

This guide contains instructions for setting up, building, and contributing to the AI Chat Exporter extension.

## Development

### Prerequisites

- **Python 3.x** (for build script modifiers)
- **zip utility** (for packaging targets)
- **Node.js** (for running tests and linter/formatter)

### Build Instructions

The extension source code and build/packaging scripts live directly in the repository root directory.

To build for all targets:

```bash
chmod +x build.sh
./build.sh
```

To build for a specific target:

```bash
./build.sh chromium  # Or firefox
```

The output zip files will be created in the `releases/` directory.

### Running Tests

To run the automated test suite:

```bash
npm test
```

To run linting and formatting validation before committing:

```bash
npm run lint && npm run format:check && npm test
```

---

## Project Structure

Here is an overview of the key folders and files inside the repository:

```
├── background/          # Background service worker
├── content/             # Content scripts & platform parsers
│   ├── parsers/         # 15+ platform-specific parsers
│   ├── formatters/      # Markdown, JSON, HTML, Image, Doc formatters
│   ├── utils/           # Parser & DOM helpers
│   └── lib/             # Third-party libraries (Turndown, Prism, KaTeX)
├── popup/               # Extension popup UI
├── sidepanel/           # Browser side panel UI (Chromium)
├── options/             # Extension preferences page UI
├── schemas/             # JSON export schemas (v1)
├── tests/               # Node test suite
├── docs/                # Web landing page & extension welcome/privacy docs
├── manifest.json        # Web Extension manifest (v3)
├── build.sh             # Main build script launcher
├── build.py             # Target bundler script (Chromium / Firefox)
└── build.js             # JavaScript build runner
```

For general information about the extension, installation, and usage, see [README.md](./README.md). For contribution guidelines and licensing terms, see [CONTRIBUTING.md](./CONTRIBUTING.md).
