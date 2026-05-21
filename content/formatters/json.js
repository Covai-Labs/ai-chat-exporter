import { ExportFormatter } from './base.js';

const SCHEMA_PATH = './schemas/export-v1.schema.json';

export class JsonFormatter extends ExportFormatter {
    constructor(options = {}) {
        super();
        this.platform = options.platform || null;
        this.url = options.url || null;
        this.exportedAt = options.exportedAt || null;
    }

    format(conversation) {
        return JSON.stringify(this.toSchema(conversation), null, 2);
    }

    toSchema(conversation) {
        const metadata = conversation.metadata || {};
        const source = metadata.Source || this.platform || 'Unknown';

        return {
            '$schema': SCHEMA_PATH,
            schemaVersion: 1,
            exportedAt: this.exportedAt || new Date().toISOString(),
            source: {
                platform: source,
                url: conversation.url || metadata.Link || this.url,
                title: conversation.title || 'AI Chat Export'
            },
            messages: (conversation.messages || []).map((message, index) => {
                return {
                    index,
                    role: normalizeRole(message.role),
                    displayRole: message.role || 'Unknown',
                    content: message.content || ''
                };
            }),
            metadata
        };
    }

    getFileExtension() {
        return 'json';
    }

    getMimeType() {
        return 'application/json';
    }
}

function normalizeRole(role) {
    const normalized = String(role || '').toLowerCase();

    if (normalized === 'user') {
        return 'user';
    }

    if (normalized.includes('artifact')) {
        return 'artifact';
    }

    if (normalized.includes('system')) {
        return 'system';
    }

    if (normalized.includes('tool')) {
        return 'tool';
    }

    if (
        normalized.includes('assistant') ||
        normalized.includes('chatgpt') ||
        normalized.includes('claude') ||
        normalized.includes('model') ||
        normalized.includes('meta ai') ||
        normalized.includes('mistral') ||
        normalized.includes('deepseek') ||
        normalized.includes('qwen') ||
        normalized.includes('perplexity')
    ) {
        return 'assistant';
    }

    return 'unknown';
}
