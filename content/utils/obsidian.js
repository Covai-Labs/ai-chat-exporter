/**
 * Utility for building Obsidian URI schemes (obsidian://new)
 */

export function cleanObsidianTitle(title) {
  if (!title) return 'AI Conversation';
  // Remove invalid filename characters: / \ : * ? " < > |
  return title.replace(/[/\\?%*:|"<>]/g, '').trim() || 'AI Conversation';
}

/**
 * Builds an obsidian://new URI
 * @param {Object} options
 * @param {string} options.title - Note title
 * @param {string} [options.content] - Note Markdown content
 * @param {string} [options.vault] - Optional Obsidian vault name or ID
 * @param {boolean} [options.useClipboard=false] - Whether to use clipboard content instead of content param
 * @returns {string} obsidian:// URI string
 */
export function buildObsidianUri({ title, content, vault, useClipboard = false }) {
  const cleanTitle = cleanObsidianTitle(title);
  const params = new URLSearchParams();

  params.append('name', cleanTitle);

  if (vault && vault.trim().length > 0) {
    params.append('vault', vault.trim());
  }

  if (useClipboard) {
    params.append('clipboard', 'true');
  } else if (content) {
    params.append('content', content);
  }

  return `obsidian://new?${params.toString()}`;
}
