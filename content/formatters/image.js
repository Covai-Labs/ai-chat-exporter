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
   * @returns {HTMLElement}
   */
  createScreenshotContainer(conversation) {
    const { title, messages } = conversation;
    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()} ${now.toLocaleTimeString('en-US', { hour12: false })}`;
    const platform = conversation.metadata?.Source || 'AI';

    const container = document.createElement('div');
    container.className = 'ai-exporter-png-container';
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 40px;
      box-sizing: border-box;
      background-color: #ffffff;
      color: #0f172a;
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
              <span style="font-size: 13px; font-weight: 600; color: #475569;">${escapeHtml(roleName)}</span>
            </div>
            <div style="max-width: 90%; background-color: ${isUser ? '#f1f5f9' : '#f8fafc'}; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 14px; color: #0f172a; word-break: break-word;">
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
        .ai-exporter-png-container .code-card { margin: 12px 0; border-radius: 8px; overflow: hidden; background: #0f172a; color: #f8fafc; border: 1px solid #1e293b; }
        .ai-exporter-png-container .code-card-header { background: #1e293b; color: #94a3b8; padding: 6px 14px; font-family: 'Fira Code', monospace; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
        .ai-exporter-png-container .code-lang { text-transform: lowercase; font-weight: 600; }
        .ai-exporter-png-container pre { background: #0f172a; color: #f8fafc; padding: 12px 16px; margin: 0; border-radius: 0; overflow-x: auto; font-family: 'Fira Code', monospace; font-size: 13px; }
        .ai-exporter-png-container code { background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: 'Fira Code', monospace; font-size: 13px; }
        .ai-exporter-png-container pre code { background: none; color: inherit; padding: 0; }
        .ai-exporter-png-container table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .ai-exporter-png-container th, .ai-exporter-png-container td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        .ai-exporter-png-container th { background: #f1f5f9; font-weight: 600; }
        .ai-exporter-png-container img { max-width: 100%; height: auto; border-radius: 8px; }
        .ai-exporter-png-container blockquote { border-left: 4px solid #4f46e5; margin: 12px 0; padding-left: 16px; color: #475569; }
        .ai-exporter-png-container hr { border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0; }
        .ai-exporter-png-container .thinking-block { margin: 12px 0; border: 1px solid #e2e8f0; border-left: 4px solid #6366f1; border-radius: 8px; background: rgba(79, 70, 229, 0.04); overflow: hidden; }
        .ai-exporter-png-container .thinking-summary { padding: 8px 12px; font-weight: 600; font-size: 13px; color: #4f46e5; display: flex; align-items: center; gap: 6px; }
        .ai-exporter-png-container .thinking-content { padding: 10px 14px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #475569; }
        .ai-exporter-png-container ul.task-list { list-style: none; padding-left: 0; }
        .ai-exporter-png-container .task-list-item { list-style: none; display: flex; align-items: baseline; gap: 6px; margin: 4px 0; }
        .ai-exporter-png-container .task-checkbox { accent-color: #4f46e5; width: 14px; height: 14px; margin: 0; }
      </style>

      <!-- Header -->
      <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span style="display: inline-block; background-color: #e0e7ff; color: #4f46e5; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px;">
            ${escapeHtml(platform)}
          </span>
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            ${escapeHtml(title || 'AI Conversation')}
          </h1>
        </div>
        <div style="font-size: 12px; color: #94a3b8; text-align: right; white-space: nowrap; margin-left: 16px;">
          ${escapeHtml(formattedDate)}
        </div>
      </div>

      <!-- Messages Body -->
      <div>
        ${formattedMessages}
      </div>

      <!-- Footer Watermark -->
      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        Exported with <strong>AI Chat Exporter</strong> • <span style="color: #6366f1;">https://ai-chat-exporter.covai.org/</span>
      </div>
    `;

    return container;
  }

  /**
   * Pre-loads image sources inside the container so html2canvas captures them cleanly
   */
  async preloadImages(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (images.length === 0) return;

    const loadPromises = images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth !== 0) {
            resolve();
            return;
          }
          const timer = setTimeout(resolve, 2500);
          img.onload = () => {
            clearTimeout(timer);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timer);
            resolve();
          };
        }),
    );

    await Promise.all(loadPromises);
  }

  /**
   * Formats the conversation into a PNG Blob
   * @param {Object} conversation
   * @param {Object} [options]
   * @returns {Promise<Blob>}
   */
  async format(conversation, options = {}) {
    const container = this.createScreenshotContainer(conversation);
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
        backgroundColor: '#ffffff',
        scale: renderScale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 3000,
      });

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate PNG blob from canvas'));
          }
        }, 'image/png');
      });
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }
}
