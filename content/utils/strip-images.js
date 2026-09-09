/**
 * Image Stripping Utility
 * Thoroughly removes all image formats, leaked image scripts, and inline base64 data.
 */

/**
 * Strips images and image data from message content.
 * @param {string} content - Markdown or text content
 * @returns {string} Content with images removed
 */
export function stripImages(content) {
  if (!content || typeof content !== 'string') return '';

  let cleaned = content;
  const placeholders = [];
  let tokenCounter = 0;

  // 0. Protect fenced code blocks (```...``` or ~~~...~~~)
  cleaned = cleaned.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
    const id = `__CODE_BLOCK_PLACEHOLDER_${tokenCounter++}__`;
    placeholders.push({ id, content: match });
    return id;
  });

  // 0.5. Protect inline code spans (`...`)
  cleaned = cleaned.replace(/(`+)([\s\S]*?)\1/g, (match) => {
    const id = `__INLINE_CODE_PLACEHOLDER_${tokenCounter++}__`;
    placeholders.push({ id, content: match });
    return id;
  });

  // 1. Remove markdown inline images: ![alt](url)
  cleaned = cleaned.replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '');

  // 1.5. Remove reference-style images: ![alt][label] and ![alt][]
  const strippedRefLabels = new Set();
  cleaned = cleaned.replace(/!\[([\s\S]*?)\]\[([\s\S]*?)\]/g, (match, alt, refId) => {
    const key = (refId || alt).trim().toLowerCase();
    if (key) strippedRefLabels.add(key);
    return '';
  });

  // Track reference labels still used by ordinary markdown text links: [text][label]
  const textLinkRefLabels = new Set();
  const textLinkRegex = /(?:^|[^!])\[([^\]]+)\]\[([^\]]*)\]/g;
  let textLinkMatch;
  while ((textLinkMatch = textLinkRegex.exec(cleaned)) !== null) {
    const key = (textLinkMatch[2] || textLinkMatch[1]).trim().toLowerCase();
    if (key) textLinkRefLabels.add(key);
  }

  // 1.6. Remove reference definitions for base64 images OR references matching stripped images
  // (unless still used by an ordinary text link)
  cleaned = cleaned.replace(
    /^\s*\[([^\]]+)\]:\s*<?(\S+?)>?(?:\s+["'(].*?["')])?\s*$/gm,
    (match, label, url) => {
      const lowerLabel = label.trim().toLowerCase();
      const isDataImage = /^data:image(?:\/|\\\/)/i.test(url.trim());
      if (
        isDataImage ||
        (strippedRefLabels.has(lowerLabel) && !textLinkRefLabels.has(lowerLabel))
      ) {
        return '';
      }
      return match;
    },
  );

  // Remove comment section for image references if left alone
  cleaned = cleaned.replace(/<!--\s*Image References\s*-->/gi, '');

  // 2. Remove HTML img tags: <img ... /> or <img ...>
  cleaned = cleaned.replace(/<img\b[\s\S]*?\/?>/gi, '');

  // 3. Remove leaked Google Search AI / SGE image injection scripts:
  cleaned = cleaned.replace(
    /(?:google\.)?(?:sn\.)?\\?_setImageSrc\s*\(\s*['"][^'"]*['"]\s*,\s*['"][^'"]*['"]\s*\);?/gi,
    '',
  );

  // 4. Remove standalone base64 data URIs (delimited by boundary, quotes, or whitespace)
  cleaned = cleaned.replace(
    /data:image(?:\/|\\\/)[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+(?:={0,2})/gi,
    '',
  );

  // 5. Remove empty list items left behind by stripped images (e.g., "- " or "* " alone on a line)
  cleaned = cleaned.replace(/^\s*[-*+]\s*$/gm, '');

  // 6. Clean up ChatGPT style "**Images:**" header if left empty
  cleaned = cleaned.replace(/\*\*Images:\*\*\s*(?=\*\*|$)/gi, '');

  // 7. Clean up ChatGPT style "**Attachments & Images:**" section header if it has no items left
  const attachHeader = '**Attachments & Images:**';
  const headerIdx = cleaned.indexOf(attachHeader);
  if (headerIdx !== -1) {
    const afterHeader = cleaned.slice(headerIdx + attachHeader.length);
    const nextHeadingMatch = afterHeader.search(/\n\s*(?:#|\*\*)/);
    const sectionBody =
      nextHeadingMatch !== -1 ? afterHeader.slice(0, nextHeadingMatch) : afterHeader;
    if (!/^\s*[-*+]\s+\S/m.test(sectionBody)) {
      const remainder = nextHeadingMatch !== -1 ? afterHeader.slice(nextHeadingMatch) : '';
      cleaned =
        cleaned.slice(0, headerIdx).trimEnd() + (remainder ? '\n\n' + remainder.trimStart() : '');
    }
  }

  // 8. Restore protected code blocks in reverse order
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const { id, content: blockContent } = placeholders[i];
    cleaned = cleaned.replace(id, () => blockContent);
  }

  // 9. Normalize spacing: collapse 3+ newlines to 2, trim
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}
