# AI Chat Exporter - Development Guide

This guide contains instructions for setting up, building, and contributing to the AI Chat Exporter extension.

## Development

### Prerequisites

- **Python 3.x** (for build script modifiers)
- **zip utility** (for packaging targets)
- **Node.js** (for running tests and linter/formatter)

### Build Instructions

The extension source code and build/packaging scripts live inside the `publish` directory.

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

Here is an overview of the key folders and files inside the extension source:

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

For general information about the extension, installation, and usage, see the [README.md](./README.md).
