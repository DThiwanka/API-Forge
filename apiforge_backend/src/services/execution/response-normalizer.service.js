/**
 * Determine whether a content-type header represents JSON
 * @param {string|null} contentType 
 * @returns {boolean}
 */
function isJsonContentType(contentType) {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return lower.includes('application/json') || lower.includes('+json');
}

/**
 * Determine whether a content-type header represents text/readable markup
 * @param {string|null} contentType 
 * @returns {boolean}
 */
function isTextContentType(contentType) {
  if (!contentType) return true; // Default to text if unknown
  const lower = contentType.toLowerCase();
  return (
    lower.startsWith('text/') ||
    lower.includes('application/xml') ||
    lower.includes('application/javascript') ||
    lower.includes('application/x-www-form-urlencoded') ||
    lower.includes('image/svg+xml')
  );
}

/**
 * Normalize an HTTP response into a consistent, safe payload
 * 
 * @param {object} params
 * @param {number} params.status - HTTP status code
 * @param {string} params.statusText - HTTP status message
 * @param {Headers|Record<string, string>} params.headers - Response headers
 * @param {Buffer} params.bodyBuffer - Raw response bytes
 * @param {number} params.timeMs - Total elapsed time in milliseconds
 * @param {string} params.url - Final executed URL
 * @param {boolean} [params.redirected=false]
 * @returns {object} Normalized response object
 */
export function normalizeResponse({
  status,
  statusText,
  headers,
  bodyBuffer,
  timeMs,
  url,
  redirected = false,
}) {
  const normalizedHeaders = {};
  let contentType = '';

  if (headers && typeof headers.forEach === 'function') {
    headers.forEach((value, key) => {
      normalizedHeaders[key.toLowerCase()] = value;
    });
  } else if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = String(value);
    }
  }

  contentType = normalizedHeaders['content-type'] || '';
  const sizeBytes = bodyBuffer ? bodyBuffer.length : 0;

  let parsedBody = null;

  if (bodyBuffer && bodyBuffer.length > 0) {
    if (isJsonContentType(contentType)) {
      const text = bodyBuffer.toString('utf-8');
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = text;
      }
    } else if (isTextContentType(contentType)) {
      parsedBody = bodyBuffer.toString('utf-8');
    } else {
      // Binary content (images, PDFs, archives, audio, octet-stream)
      parsedBody = {
        type: 'binary',
        contentType,
        sizeBytes,
        base64: bodyBuffer.toString('base64'),
      };
    }
  }

  return {
    status,
    statusText: statusText || '',
    headers: normalizedHeaders,
    body: parsedBody,
    sizeBytes,
    timeMs: Math.round(timeMs),
    url,
    redirected,
    contentType,
  };
}

export default {
  normalizeResponse,
};

