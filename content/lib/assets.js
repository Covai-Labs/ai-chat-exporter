import fs from 'node:fs';
import path from 'node:path';

let katexCss = '';
let katexJs = '';
let autoRenderJs = '';
let prismCss = '';
let prismJs = '';

try {
  if (typeof process !== 'undefined' && process.cwd) {
    const base = process.cwd();
    katexCss = fs.readFileSync(path.join(base, 'content/lib/katex/katex.min.css'), 'utf8');
    katexJs = fs.readFileSync(path.join(base, 'content/lib/katex/katex.min.js'), 'utf8');
    autoRenderJs = fs.readFileSync(path.join(base, 'content/lib/katex/auto-render.min.js'), 'utf8');
    prismCss = fs.readFileSync(path.join(base, 'content/lib/prismjs/prism-tomorrow.min.css'), 'utf8');
    prismJs = fs.readFileSync(path.join(base, 'content/lib/prismjs/prism-bundle.js'), 'utf8');
  }
} catch {
  // Ignore
}

export { katexCss, katexJs, autoRenderJs, prismCss, prismJs };
