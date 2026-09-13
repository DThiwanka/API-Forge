/**
 * Request Body Authoring and Formatting Utilities
 * 
 * Provides robust JSON validation with line/column diagnostics,
 * variable-preserving JSON formatting, payload metrics calculation,
 * and non-destructive inter-mode conversions.
 */

/**
 * Extract line and column numbers from a string index
 * 
 * @param {string} text 
 * @param {number} position 
 * @returns {{ line: number, column: number }}
 */
export function getLineAndColumnFromPosition(text = '', position = 0) {
  if (!text || typeof text !== 'string') {
    return { line: 1, column: 1 };
  }

  const safePos = Math.max(0, Math.min(position, text.length));
  const before = text.slice(0, safePos);
  const lines = before.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return { line, column };
}

/**
 * Validate JSON text with template variable tolerance
 * 
 * @param {string} rawText 
 * @returns {{
 *   valid: boolean,
 *   templated: boolean,
 *   empty: boolean,
 *   error: string | null,
 *   line?: number,
 *   column?: number
 * }}
 */
export function validateJson(rawText = '') {
  if (!rawText || !rawText.trim()) {
    return { valid: true, templated: false, empty: true, error: null };
  }

  // 1. Standard JSON validation
  try {
    JSON.parse(rawText);
    return { valid: true, templated: false, empty: false, error: null };
  } catch (strictErr) {
    // 2. Variable-tolerant validation (substitute quoted "{{...}}" first, then unquoted {{...}})
    try {
      let relaxed = rawText.replace(/"\{\{\s*[\w.-]+\s*\}\}"/g, '"__TPL_STR__"');
      relaxed = relaxed.replace(/\{\{\s*[\w.-]+\s*\}\}/g, '"__TPL_VAL__"');
      JSON.parse(relaxed);
      return { valid: true, templated: true, empty: false, error: null };
    } catch {
      // Extract position or line info from the original strict error
      const message = strictErr.message || 'Invalid JSON';
      let line = 1;
      let column = 1;

      // Extract "at line X column Y" or "at position Z"
      const lineColMatch = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
      const posMatch = message.match(/position\s+(\d+)/i);

      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
      } else if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const derived = getLineAndColumnFromPosition(rawText, pos);
        line = derived.line;
        column = derived.column;
      }

      return {
        valid: false,
        templated: false,
        empty: false,
        error: message,
        line,
        column,
      };
    }
  }
}

/**
 * Pretty-print JSON while strictly preserving {{variables}}
 * 
 * @param {string} rawText 
 * @returns {string} Formatted JSON
 */
export function formatJson(rawText = '') {
  if (!rawText || !rawText.trim()) return '';

  // 1. Try standard JSON formatting
  try {
    const parsed = JSON.parse(rawText);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // 2. Variable-tolerant formatting
    const quotedTokens = [];
    const unquotedTokens = [];

    // First replace quoted "{{var}}" with unique token
    let preprocessed = rawText.replace(/"\{\{\s*([\w.-]+)\s*\}\}"/g, (match) => {
      const id = `__APIFORGE_Q_VAR_${quotedTokens.length}__`;
      quotedTokens.push(match);
      return `"${id}"`;
    });

    // Next replace unquoted {{var}} with unique token
    preprocessed = preprocessed.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match) => {
      const id = `__APIFORGE_UQ_VAR_${unquotedTokens.length}__`;
      unquotedTokens.push(match);
      return `"${id}"`;
    });

    try {
      const parsed = JSON.parse(preprocessed);
      let formatted = JSON.stringify(parsed, null, 2);

      // Restore unquoted tokens (remove quotes around them)
      unquotedTokens.forEach((match, idx) => {
        const id = `"__APIFORGE_UQ_VAR_${idx}__"`;
        formatted = formatted.replace(id, match);
      });

      // Restore quoted tokens
      quotedTokens.forEach((match, idx) => {
        const id = `"__APIFORGE_Q_VAR_${idx}__"`;
        formatted = formatted.replace(id, match);
      });

      return formatted;
    } catch {
      throw new Error('Cannot format: body contains invalid JSON syntax');
    }
  }
}

/**
 * Format bytes into readable string (B, KB, MB)
 * 
 * @param {number} bytes 
 * @returns {string}
 */
export function formatByteSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculate payload metrics (lines, byte size, formatted size)
 * 
 * @param {string|Array} content 
 * @param {string} mode 
 * @returns {{ lines: number, sizeBytes: number, formattedSize: string }}
 */
export function calculatePayloadMetrics(content, mode = 'raw') {
  if (mode === 'none' || !content) {
    return { lines: 0, sizeBytes: 0, formattedSize: '0 B' };
  }

  if (typeof content === 'string') {
    const sizeBytes = new TextEncoder().encode(content).length;
    const lines = content.length === 0 ? 0 : content.split('\n').length;
    return {
      lines,
      sizeBytes,
      formattedSize: formatByteSize(sizeBytes),
    };
  }

  if (Array.isArray(content)) {
    const activeRows = content.filter((r) => r.enabled !== false && (r.key?.trim() || r.value?.trim()));
    const serialized = activeRows.map((r) => `${r.key}=${r.value}`).join('&');
    const sizeBytes = new TextEncoder().encode(serialized).length;
    return {
      lines: activeRows.length,
      sizeBytes,
      formattedSize: formatByteSize(sizeBytes),
    };
  }

  return { lines: 0, sizeBytes: 0, formattedSize: '0 B' };
}

/**
 * Convert URL-encoded parameter rows to Multipart Form-Data rows
 * 
 * @param {Array<{ key: string, value: string, enabled?: boolean, description?: string }>} urlencodedRows 
 * @returns {Array<{ key: string, value: string, type: 'text'|'file', enabled: boolean, description: string }>}
 */
export function convertUrlEncodedToFormData(urlencodedRows = []) {
  if (!Array.isArray(urlencodedRows) || urlencodedRows.length === 0) {
    return [{ key: '', value: '', type: 'text', enabled: true, description: '' }];
  }

  return urlencodedRows.map((item) => ({
    key: item.key ?? '',
    value: item.value ?? '',
    type: 'text',
    enabled: item.enabled !== false,
    description: item.description ?? '',
  }));
}

/**
 * Convert Multipart Form-Data rows to URL-encoded parameter rows
 * 
 * @param {Array<{ key: string, value: string, type?: string, enabled?: boolean, description?: string }>} formDataRows 
 * @returns {Array<{ key: string, value: string, enabled: boolean, description: string }>}
 */
export function convertFormDataToUrlEncoded(formDataRows = []) {
  if (!Array.isArray(formDataRows) || formDataRows.length === 0) {
    return [{ key: '', value: '', enabled: true, description: '' }];
  }

  return formDataRows.map((item) => ({
    key: item.key ?? '',
    value: item.value ?? '',
    enabled: item.enabled !== false,
    description: item.description ?? '',
  }));
}

export default {
  getLineAndColumnFromPosition,
  validateJson,
  formatJson,
  formatByteSize,
  calculatePayloadMetrics,
  convertUrlEncodedToFormData,
  convertFormDataToUrlEncoded,
};
