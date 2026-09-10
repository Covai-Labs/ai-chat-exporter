import { defineConfig } from 'astro/config';

// Sitemap is intentionally static (public/sitemap.xml) — URLs never change,
// so the build runs fast and there is no sitemap index duplication.
export default defineConfig({
  site: 'https://ai-chat-exporter.covai.org',
  outDir: '../docs',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
    emptyOutDir: true,
  },
});
