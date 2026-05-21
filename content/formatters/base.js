export class ExportFormatter {
  constructor() {}

  /**
   * Formats the conversation object into a string/blob
   * @param {{ title: string, messages: Array<{role: string, content: string}> }} conversation
   * @returns {string} The formatted content
   */
  format(_conversation) {
    throw new Error('Not implemented');
  }

  getFileExtension() {
    throw new Error('Not implemented');
  }

  getMimeType() {
    throw new Error('Not implemented');
  }
}
