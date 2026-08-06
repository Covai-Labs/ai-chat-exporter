import { ExportFormatter } from './base.js';
import { markdownToHtml, escapeHtml } from './html.js';

export class ImageFormatter extends ExportFormatter {
  getFileExtension() {
    return 'png';
  }

  getMimeType() {
    return 'image/png';
  }

  /**
   * Generates a styled HTML container for the conversation
   * @param {Object} conversation
   * @param {Object} [options]
   * @returns {HTMLElement}
   */
  createScreenshotContainer(conversation, options = {}) {
    const isDark = options.isDark === true || options.theme === 'dark';
    const { title, messages } = conversation;
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;
    const platform = conversation.metadata?.Source || 'AI';
    const model = conversation.metadata?.Model || '';

    const bgColor = isDark ? '#0f172a' : '#ffffff';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const subtitleColor = isDark ? '#94a3b8' : '#475569';
    const borderColor = isDark ? '#1e293b' : '#e2e8f0';
    const userBg = isDark ? '#1e293b' : '#f1f5f9';
    const userBorder = isDark ? '#334155' : '#e2e8f0';
    const assistantBg = isDark ? '#0f172a' : '#f8fafc';
    const assistantBorder = isDark ? '#1e293b' : '#e2e8f0';
    const inlineCodeBg = isDark ? '#1e293b' : '#e2e8f0';
    const inlineCodeText = isDark ? '#f8fafc' : '#0f172a';
    const tableHeaderBg = isDark ? '#1e293b' : '#f1f5f9';
    const tableBorder = isDark ? '#334155' : '#cbd5e1';
    const thinkingBg = isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.04)';
    const thinkingText = isDark ? '#cbd5e1' : '#475569';

    const container = document.createElement('div');
    container.className = 'ai-exporter-png-container';
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 40px;
      box-sizing: border-box;
      background-color: ${bgColor};
      color: ${textColor};
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    `;

    const formattedMessages = messages
      .map((msg) => {
        const isUser = msg.role === 'User';
        const roleName = isUser ? 'User' : platform;
        const avatarBg = isUser ? '#4f46e5' : '#0ea5e9';
        const avatarText = isUser ? 'U' : platform[0];
        const htmlContent = markdownToHtml(msg.content);

        return `
          <div style="margin-bottom: 24px; display: flex; flex-direction: column; align-items: ${isUser ? 'flex-end' : 'flex-start'};">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${avatarBg}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
                ${escapeHtml(avatarText)}
              </div>
              <span style="font-size: 13px; font-weight: 600; color: ${subtitleColor};">${escapeHtml(roleName)}</span>
            </div>
            <div style="max-width: 90%; background-color: ${isUser ? userBg : assistantBg}; border: 1px solid ${isUser ? userBorder : assistantBorder}; border-radius: 12px; padding: 16px 20px; font-size: 14px; color: ${textColor}; word-break: break-word;">
              ${htmlContent}
            </div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <style>
        .ai-exporter-png-container .copy-code-btn,
        .ai-exporter-png-container .copy-msg-btn { display: none !important; }
        .ai-exporter-png-container .code-card { margin: 12px 0; border-radius: 8px; overflow: hidden; background: ${isDark ? '#020617' : '#0f172a'}; color: #f8fafc; border: 1px solid ${isDark ? '#1e293b' : '#1e293b'}; }
        .ai-exporter-png-container .code-card-header { background: ${isDark ? '#0f172a' : '#1e293b'}; color: #94a3b8; padding: 6px 14px; font-family: 'Fira Code', monospace; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
        .ai-exporter-png-container .code-lang { text-transform: lowercase; font-weight: 600; }
        .ai-exporter-png-container pre { background: ${isDark ? '#020617' : '#0f172a'}; color: #f8fafc; padding: 12px 16px; margin: 0; border-radius: 0; overflow-x: auto; font-family: 'Fira Code', monospace; font-size: 13px; }
        .ai-exporter-png-container code { background: ${inlineCodeBg}; color: ${inlineCodeText}; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 13px; }
        .ai-exporter-png-container pre code { background: none; color: inherit; padding: 0; }
        .ai-exporter-png-container table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .ai-exporter-png-container th, .ai-exporter-png-container td { border: 1px solid ${tableBorder}; padding: 8px 12px; text-align: left; }
        .ai-exporter-png-container th { background: ${tableHeaderBg}; font-weight: 600; }
        .ai-exporter-png-container img { max-width: 100%; height: auto; border-radius: 8px; }
        .ai-exporter-png-container blockquote { border-left: 4px solid #4f46e5; margin: 12px 0; padding-left: 16px; color: ${subtitleColor}; }
        .ai-exporter-png-container hr { border: 0; border-top: 1px solid ${borderColor}; margin: 24px 0; }
        .ai-exporter-png-container .thinking-block { margin: 12px 0; border: 1px solid ${borderColor}; border-left: 4px solid #6366f1; border-radius: 8px; background: ${thinkingBg}; overflow: hidden; }
        .ai-exporter-png-container .thinking-summary { padding: 8px 12px; font-weight: 600; font-size: 13px; color: #4f46e5; display: flex; align-items: center; gap: 6px; }
        .ai-exporter-png-container .thinking-content { padding: 10px 14px; border-top: 1px solid ${borderColor}; font-size: 13px; color: ${thinkingText}; }
        .ai-exporter-png-container ul.task-list { list-style: none; padding-left: 0; }
        .ai-exporter-png-container .task-list-item { list-style: none; display: flex; align-items: baseline; gap: 6px; margin: 4px 0; }
        .ai-exporter-png-container .task-checkbox { accent-color: #4f46e5; width: 14px; height: 14px; margin: 0; }
      </style>

      <!-- Header -->
      <div style="border-bottom: 2px solid ${borderColor}; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
            <span style="display: inline-block; background-color: ${isDark ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff'}; color: ${isDark ? '#818cf8' : '#4f46e5'}; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px;">
              ${escapeHtml(platform)}
            </span>
            ${model ? `<span style="display: inline-block; background-color: ${isDark ? '#1e293b' : '#f1f5f9'}; color: ${subtitleColor}; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px;">Model: ${escapeHtml(model)}</span>` : ''}
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${textColor}; line-height: 1.3;">
            ${escapeHtml(title || 'AI Conversation')}
          </h1>
        </div>
        <div style="font-size: 12px; color: #94a3b8; text-align: right; white-space: nowrap; margin-left: 16px;">
          <div>${escapeHtml(formattedDate)}</div>
          <div style="margin-top: 2px;"><a href="https://ai-chat-exporter.covai.org" target="_blank" style="color: #94a3b8; text-decoration: none;">AI Chat Exporter</a></div>
        </div>
      </div>

      <!-- Messages Body -->
      <div>
        ${formattedMessages}
      </div>

      <!-- Footer Watermark -->
      <div style="margin-top: 40px; border-top: 1px solid ${borderColor}; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        Exported with <strong>AI Chat Exporter</strong> • <span style="color: #6366f1;">https://ai-chat-exporter.covai.org/</span>
      </div>
    `;

    return container;
  }

  /**
   * Pre-loads image sources inside the container so html2canvas captures them cleanly
   * and converts cross-origin images to Data URLs to prevent canvas tainting ("The operation is insecure").
   */
  async preloadImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return;

    const processImage = async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;

      // 1. Try fetching as Blob and converting to Data URL
      try {
        if (typeof fetch !== 'undefined') {
          const response = await fetch(src, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.setAttribute('src', dataUrl);
            return;
          }
        }
      } catch {
        // Fetch failed due to CORS or network error
      }

      // 2. Try using Image element with crossOrigin = 'anonymous' and offscreen canvas
      try {
        if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
          const safeDataUrl = await new Promise((resolve, reject) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            const timer = setTimeout(() => reject(new Error('Image load timeout')), 2500);
            tempImg.onload = () => {
              clearTimeout(timer);
              try {
                const c = document.createElement('canvas');
                c.width = tempImg.naturalWidth || tempImg.width || 100;
                c.height = tempImg.naturalHeight || tempImg.height || 100;
                const ctx = c.getContext('2d');
                ctx.drawImage(tempImg, 0, 0);
                resolve(c.toDataURL('image/png'));
              } catch (err) {
                reject(err);
              }
            };
            tempImg.onerror = () => {
              clearTimeout(timer);
              reject(new Error('Image load error'));
            };
            tempImg.src = src;
          });
          img.setAttribute('src', safeDataUrl);
          return;
        }
      } catch {
        // Canvas drawing failed or crossOrigin was blocked by browser
      }

      // 3. Fallback: Replace image with safe placeholder to prevent tainting the canvas
      const altText = img.getAttribute('alt') || 'External Image';
      const placeholder = document.createElement('span');
      placeholder.className = 'ai-exporter-img-placeholder';
      placeholder.style.cssText =
        'display: inline-block; padding: 4px 8px; background: #f1f5f9; color: #64748b; border-radius: 4px; font-size: 12px; border: 1px dashed #cbd5e1; margin: 4px 0;';
      placeholder.textContent = `🖼️ [${altText}]`;
      img.replaceWith(placeholder);
    };

    await Promise.all(images.map((img) => processImage(img)));
  }

  /**
   * Formats the conversation into a PNG Blob
   * @param {Object} conversation
   * @param {Object} [options]
   * @returns {Promise<Blob>}
   */
  async format(conversation, options = {}) {
    const isDark = options.isDark === true || options.theme === 'dark';
    const container = this.createScreenshotContainer(conversation, options);
    document.body.appendChild(container);

    try {
      await this.preloadImages(container);

      const html2canvasFn =
        typeof window !== 'undefined' && window.html2canvas
          ? window.html2canvas
          : typeof globalThis !== 'undefined' && globalThis.html2canvas
            ? globalThis.html2canvas
            : null;

      if (!html2canvasFn) {
        throw new Error('html2canvas library is not loaded');
      }

      const isHighQuality = options ? options.highQuality !== false : true;
      const renderScale = isHighQuality ? 2 : 1;

      const canvas = await html2canvasFn(container, {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        scale: renderScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 3000,
      });

      return new Promise((resolve, reject) => {
        try {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate PNG blob from canvas'));
            }
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      });
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }
}
