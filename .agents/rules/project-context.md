---
trigger: always_on
---

# Project: AI Chat Exporter Extension

## Overview & Reference Docs
* **General Info & Supported Platforms:** See [README.md](file:///home/anu/Workspace/Public/Add-ons/ai-chat-exporter/README.md)
* **Build Instructions, Test Commands & Project Structure:** See [DEVELOPMENT.md](file:///home/anu/Workspace/Public/Add-ons/ai-chat-exporter/DEVELOPMENT.md)

## Repository & Automation
* **Repository:** Public GitHub repository (`https://github.com/Rat-S/ai-chat-exporter.git`)
* **CI/CD & Release Workflow:** Pushing a version tag (e.g. `v1.1.0`) triggers `.github/workflows/build.yml` to draft GitHub releases and publish Firefox AMO updates.

## Agent Guidelines & Safeguards
* **Git Push Restriction (CRITICAL):** AI agents must NEVER push changes to GitHub without explicit user consent.
* **Versioning Policy:** Follow Semantic Versioning (SemVer) for version bumps and tags.
* **DOM Resilience:** Use robust selectors (like ARIA attributes) over frequently changing CSS classes when updating content parsers.
* **Markdown Formatting:** Ensure LaTeX math expressions are properly escaped (`$` / `$$`).
* **Verification:** Run `npm run lint && npm run format:check && npm test` before completing tasks.