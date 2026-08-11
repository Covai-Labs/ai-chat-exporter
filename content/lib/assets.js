function getAsset(definedVal, relativePath) {
  if (typeof definedVal === 'string' && definedVal.length > 0) {
    return definedVal;
  }
  try {
    if (typeof process !== 'undefined' && process.versions?.node) {
      // Dynamic require for Node.js test environment to prevent bundler warnings
      const req = typeof require !== 'undefined' ? require : null;
      if (req) {
        const fs = req('node:fs');
        const path = req('node:path');
        const fullPath = path.resolve(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
          return fs.readFileSync(fullPath, 'utf8');
        }
      }
    }
  } catch {
    // Ignore error in browser context
  }
  return '';
}

export const katexCss = getAsset(
  typeof __KATEX_CSS__ !== 'undefined' ? __KATEX_CSS__ : undefined,
  'content/lib/katex/katex.min.css',
);
export const katexJs = getAsset(
  typeof __KATEX_JS__ !== 'undefined' ? __KATEX_JS__ : undefined,
  'content/lib/katex/katex.min.js',
);
export const autoRenderJs = getAsset(
  typeof __AUTO_RENDER_JS__ !== 'undefined' ? __AUTO_RENDER_JS__ : undefined,
  'content/lib/katex/auto-render.min.js',
);
export const prismCss = getAsset(
  typeof __PRISM_CSS__ !== 'undefined' ? __PRISM_CSS__ : undefined,
  'content/lib/prismjs/prism-tomorrow.min.css',
);
export const prismJs = getAsset(
  typeof __PRISM_JS__ !== 'undefined' ? __PRISM_JS__ : undefined,
  'content/lib/prismjs/prism-bundle.js',
);
