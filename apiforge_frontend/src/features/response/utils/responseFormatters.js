export function formatTime(ms) {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatSize(bytes) {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isBinaryContentType(contentType) {
  if (!contentType || typeof contentType !== 'string') return false;
  const lower = contentType.toLowerCase();

  // SVG is vector XML text, not binary stream
  if (lower.includes('image/svg+xml')) return false;

  return (
    lower.includes('image/') ||
    lower.includes('audio/') ||
    lower.includes('video/') ||
    lower.includes('application/octet-stream') ||
    lower.includes('application/pdf') ||
    lower.includes('application/zip') ||
    lower.includes('application/gzip') ||
    lower.includes('application/x-tar') ||
    lower.includes('application/wasm')
  );
}

/**
 * Categorize content type into standard debugging display formats:
 * 'json' | 'html' | 'xml' | 'text' | 'binary'
 */
export function detectContentType(contentType, body) {
  if (isBinaryContentType(contentType)) {
    return 'binary';
  }

  const lower = (contentType || '').toLowerCase();

  if (lower.includes('application/json') || lower.includes('+json')) {
    return 'json';
  }

  if (lower.includes('text/html') || lower.includes('application/xhtml+xml')) {
    return 'html';
  }

  if (
    lower.includes('application/xml') ||
    lower.includes('text/xml') ||
    lower.includes('+xml') ||
    lower.includes('image/svg+xml')
  ) {
    return 'xml';
  }

  // Fallback heuristic on body content if header was generic or missing
  if (typeof body === 'object' && body !== null) {
    return 'json';
  }

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {
        // Not valid JSON
      }
    }
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html') || trimmed.startsWith('<head') || trimmed.startsWith('<body')) {
      return 'html';
    }
    if (trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.endsWith('>') && !trimmed.startsWith('<!'))) {
      return 'xml';
    }
  }

  return 'text';
}

/**
 * Checks if the payload size exceeds the high-performance threshold (500KB)
 * to guard against freezing the UI when rendering interactive trees or large syntax highlighted DOM nodes.
 */
export function isLargePayload(sizeBytes, bodyText) {
  const SIZE_LIMIT = 500 * 1024; // 500 KB
  if (typeof sizeBytes === 'number' && sizeBytes > SIZE_LIMIT) return true;
  if (typeof bodyText === 'string' && bodyText.length > SIZE_LIMIT) return true;
  return false;
}

export function parseBodyContent(body) {
  if (body === null || body === undefined) {
    return { formattedText: '', isJson: false };
  }

  if (typeof body === 'object') {
    try {
      return {
        formattedText: JSON.stringify(body, null, 2),
        isJson: true,
        parsedJson: body,
      };
    } catch {
      return { formattedText: String(body), isJson: false };
    }
  }

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return {
          formattedText: JSON.stringify(parsed, null, 2),
          isJson: true,
          parsedJson: parsed,
        };
      } catch {
        return { formattedText: body, isJson: false };
      }
    }
    return { formattedText: body, isJson: false };
  }

  return { formattedText: String(body), isJson: false };
}

export default {
  formatTime,
  formatSize,
  isBinaryContentType,
  detectContentType,
  isLargePayload,
  parseBodyContent,
};
