import log from 'loglevel';

// Create a root logger for AI Chat Exporter
const rootLogger = log.getLogger('ai-chat-exporter');

// Set default level to debug so diagnostic insights are preserved
rootLogger.setLevel(log.levels.DEBUG);

/**
 * Creates a namespaced child logger
 * @param {string} namespace - e.g. 'ContentScript', 'Popup', 'Preview', 'ChatGPT'
 */
export function createLogger(namespace) {
  const prefix = namespace ? `[AI Exporter:${namespace}]` : '[AI Exporter]';
  return {
    trace: (...args) => rootLogger.trace(prefix, ...args),
    debug: (...args) => rootLogger.debug(prefix, ...args),
    info: (...args) => rootLogger.info(prefix, ...args),
    warn: (...args) => rootLogger.warn(prefix, ...args),
    error: (...args) => rootLogger.error(prefix, ...args),
    setLevel: (level) => rootLogger.setLevel(level),
    getLevel: () => rootLogger.getLevel(),
  };
}

export default createLogger();
