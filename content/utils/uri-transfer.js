/**
 * Utility for building URI schemes for PKM & Note-taking apps
 * Supports Obsidian, Logseq, Bear, NotePlan, and Drafts
 */

export function cleanUriTitle(title) {
  if (!title) return 'AI Conversation';
  // Remove Obsidian/Markdown reserved characters (# | ^ [ ]) and OS invalid characters (/ \ : * ? " < > |)
  const cleaned = title
    .replace(/[#|^[\]]/g, '')
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim()
    .slice(0, 245);
  return cleaned || 'AI Conversation';
}

export function cleanObsidianTitle(title) {
  return cleanUriTitle(title);
}

export function buildObsidianUri({ title, content, vault, useClipboard = false }) {
  const cleanTitle = cleanUriTitle(title);
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

export function buildLogseqUri({ title, content }) {
  const cleanTitle = cleanUriTitle(title);
  const params = new URLSearchParams();
  params.append('page', cleanTitle);
  if (content) {
    params.append('content', content);
  }
  return `logseq://x-callback-url/quickCapture?${params.toString()}`;
}

export function buildBearUri({ title, content }) {
  const cleanTitle = cleanUriTitle(title);
  const params = new URLSearchParams();
  params.append('title', cleanTitle);
  if (content) {
    params.append('text', content);
  }
  return `bear://x-callback-url/create?${params.toString()}`;
}

export function buildNotePlanUri({ title, content }) {
  const cleanTitle = cleanUriTitle(title);
  const params = new URLSearchParams();
  params.append('noteTitle', cleanTitle);
  if (content) {
    params.append('text', content);
  }
  return `noteplan://x-callback-url/addText?${params.toString()}`;
}

export function buildDraftsUri({ title, content }) {
  const cleanTitle = cleanUriTitle(title);
  const fullText = title ? `# ${cleanTitle}\n\n${content || ''}` : content || '';
  const params = new URLSearchParams();
  params.append('text', fullText);
  return `drafts://x-callback-url/create?${params.toString()}`;
}

export function buildAppUri(target, { title, content, vault }) {
  switch (target) {
    case 'obsidian':
      return buildObsidianUri({ title, content, vault });
    case 'logseq':
      return buildLogseqUri({ title, content });
    case 'bear':
      return buildBearUri({ title, content });
    case 'noteplan':
      return buildNotePlanUri({ title, content });
    case 'drafts':
      return buildDraftsUri({ title, content });
    default:
      return null;
  }
}
