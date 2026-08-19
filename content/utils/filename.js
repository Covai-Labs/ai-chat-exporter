/**
 * Utility for formatting and sanitizing export filenames using templates.
 */

export const DEFAULT_FILENAME_TEMPLATE = '{platform} - {title} - {datetime}';

/**
 * Formats a filename based on a template string and contextual properties.
 *
 * @param {string} [template] - Template string with tokens like {platform}, {title}, {date}, {time}, {datetime}
 * @param {Object} [context]
 * @param {string} [context.platform='AI'] - Platform name (e.g. Gemini, ChatGPT, Claude)
 * @param {string} [context.title='Conversation'] - Chat or conversation title
 * @param {Date|number|string} [context.date=new Date()] - Date to format
 * @returns {string} Sanitized filename without extension
 */
export function formatFilename(
  template,
  { platform = 'AI', title = 'Conversation', date = new Date() } = {},
) {
  const now = date instanceof Date ? date : new Date(date || Date.now());
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');

  // Sanitize title for filename usage (remove characters invalid across Windows/Linux/macOS)
  const cleanTitle =
    (title || 'Conversation')
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Conversation';

  const cleanPlatform =
    (platform || 'AI')
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'AI';

  const replacements = {
    '{platform}': cleanPlatform,
    '{title}': cleanTitle,
    '{date}': `${yyyy}-${mm}-${dd}`,
    '{time}': `${hh}-${min}`,
    '{datetime}': `${yyyy}-${mm}-${dd}_${hh}-${min}`,
    '{timestamp}': `${yyyy}-${mm}-${dd}_${hh}-${min}`,
  };

  let formatted = (template && template.trim()) || DEFAULT_FILENAME_TEMPLATE;
  for (const [token, val] of Object.entries(replacements)) {
    formatted = formatted.replaceAll(token, val);
  }

  // Remove any remaining illegal filename characters and clean up whitespace
  const finalFilename = formatted
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  return finalFilename || `${cleanPlatform} - ${cleanTitle}`;
}
