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
  return (
    lower.includes('image/') ||
    lower.includes('audio/') ||
    lower.includes('video/') ||
    lower.includes('application/octet-stream') ||
    lower.includes('application/pdf') ||
    lower.includes('application/zip') ||
    lower.includes('application/gzip')
  );
}

export function parseBodyContent(body) {
  if (body === null || body === undefined) {
    return { formattedText: '', isJson: false };
  }

  if (typeof body === 'object') {
    try {
      return { formattedText: JSON.stringify(body, null, 2), isJson: true };
    } catch {
      return { formattedText: String(body), isJson: false };
    }
  }

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return { formattedText: JSON.stringify(parsed, null, 2), isJson: true };
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
  parseBodyContent,
};

