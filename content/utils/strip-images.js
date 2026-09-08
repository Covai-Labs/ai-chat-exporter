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

  // 1. Remove markdown images: ![alt](url) (using [\\s\\S]*? to handle multi-line base64 URLs)
  cleaned = cleaned.replace(/!\[[\s\S]*?\]\([\s\S]*?\)/g, '');

  // 2. Remove HTML img tags: <img ... /> or <img ...>
  cleaned = cleaned.replace(/<img\b[\s\S]*?\/?>/gi, '');

  // 3. Remove leaked Google Search AI / SGE image injection scripts:
  // e.g. sn._setImageSrc('...', 'data:image...') or sn.\_setImageSrc(...)
  cleaned = cleaned.replace(/(?:google\.)?(?:sn\.)?\\?_setImageSrc\s*\([\s\S]*?\);?/gi, '');

  // 4. Remove standalone base64 data URIs (delimited by boundary, quotes, or whitespace)
  cleaned = cleaned.replace(
    /data:image(?:\/|\\\/)[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+(?:={0,2})/gi,
    '',
  );

  // 5. Remove empty list items left behind by stripped images (e.g., "- " or "* " alone on a line)
  cleaned = cleaned.replace(/^\s*[-*+]\s*$/gm, '');

  // 6. Clean up ChatGPT style "**Images:**" header if left empty
  cleaned = cleaned.replace(/\*\*Images:\*\*\s*(?=\*\*|$)/gi, '');

  // 7. Clean up ChatGPT style "**Attachments & Images:**" section if it has no items left
  const attachmentSectionIndex = cleaned.indexOf('**Attachments & Images:**');
  if (attachmentSectionIndex !== -1) {
    const afterHeader = cleaned.slice(attachmentSectionIndex + '**Attachments & Images:**'.length);
    if (!/- \S/g.test(afterHeader)) {
      cleaned = cleaned.slice(0, attachmentSectionIndex);
    }
  }

  // 8. Normalize spacing: collapse 3+ newlines to 2, trim
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}
