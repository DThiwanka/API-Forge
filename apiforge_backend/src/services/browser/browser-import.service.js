import { AppError } from '../../utils/appError.js';
import networkService from './network.service.js';

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'apikey',
  'token',
  'secret',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
]);

const BROWSER_INTERNAL_HEADERS = new Set([
  'host',
  'content-length',
  'connection',
  'keep-alive',
  'upgrade',
  'transfer-encoding',
]);

/**
 * Checks if a header key is sensitive and must be excluded / redacted
 */
export function isSensitiveHeader(key = '') {
  const lower = key.toLowerCase().trim();
  if (SENSITIVE_HEADER_KEYS.has(lower)) return true;
  if (
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('api-key') ||
    lower.includes('apikey')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a header key is internal to browser networking / transport
 */
export function isBrowserInternalHeader(key = '') {
  const lower = key.toLowerCase().trim();
  if (BROWSER_INTERNAL_HEADERS.has(lower)) return true;
  if (lower.startsWith('sec-')) return true;
  return false;
}

/**
 * Classifies headers into safe headers, redacted headers, and excluded internal headers
 */
export function sanitizeHeaders(rawHeaders = {}) {
  const safeHeaders = [];
  const redactedHeaders = [];
  const excludedHeaders = [];

  for (const [key, value] of Object.entries(rawHeaders)) {
    if (isSensitiveHeader(key)) {
      redactedHeaders.push(key);
    } else if (isBrowserInternalHeader(key)) {
      excludedHeaders.push(key);
    } else {
      safeHeaders.push({
        key,
        value: typeof value === 'string' ? value : String(value),
        enabled: true,
      });
    }
  }

  return { safeHeaders, redactedHeaders, excludedHeaders };
}

/**
 * Parse and sanitize body content from captured request postData
 */
export function sanitizeBody(postData, contentType = '') {
  const ct = contentType.toLowerCase();

  if (!postData || typeof postData !== 'string' || !postData.trim()) {
    return {
      body: {
        mode: 'none',
        raw: '',
        urlencoded: [],
        formData: [],
      },
      warnings: [],
    };
  }

  const warnings = [];

  // 1. JSON
  if (ct.includes('application/json') || (postData.trim().startsWith('{') && postData.trim().endsWith('}')) || (postData.trim().startsWith('[') && postData.trim().endsWith(']'))) {
    try {
      const parsed = JSON.parse(postData);
      return {
        body: {
          mode: 'raw',
          raw: JSON.stringify(parsed, null, 2),
          urlencoded: [],
          formData: [],
        },
        warnings,
      };
    } catch {
      return {
        body: {
          mode: 'raw',
          raw: postData,
          urlencoded: [],
          formData: [],
        },
        warnings: ['JSON payload may be malformed or truncated.'],
      };
    }
  }

  // 2. Form URL Encoded
  if (ct.includes('application/x-www-form-urlencoded')) {
    try {
      const params = new URLSearchParams(postData);
      const urlencoded = [];
      params.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
          warnings.push(`Sensitive form field "${key}" was omitted for security.`);
        } else {
          urlencoded.push({ key, value, enabled: true });
        }
      });
      return {
        body: {
          mode: 'urlencoded',
          raw: '',
          urlencoded,
          formData: [],
        },
        warnings,
      };
    } catch {
      return {
        body: {
          mode: 'raw',
          raw: postData,
          urlencoded: [],
          formData: [],
        },
        warnings: [],
      };
    }
  }

  // 3. Multipart Form Data
  if (ct.includes('multipart/form-data')) {
    warnings.push('Multipart form files were omitted for security. Re-attach files manually in API Client if needed.');
    return {
      body: {
        mode: 'formData',
        raw: '',
        urlencoded: [],
        formData: [
          {
            key: 'file',
            value: '[browser-upload omitted]',
            type: 'text',
            enabled: true,
            description: 'File upload omitted during browser import',
          },
        ],
      },
      warnings,
    };
  }

  // 4. Fallback: raw text
  return {
    body: {
      mode: 'raw',
      raw: postData,
      urlencoded: [],
      formData: [],
    },
    warnings,
  };
}

/**
 * Generate a sanitized APIForge import preview from a captured network event DTO
 * Never persists any request in database.
 */
export function generateImportPreview(event) {
  if (!event || typeof event !== 'object') {
    throw new AppError('Captured network event is invalid or empty', 400, {
      code: 'INVALID_NETWORK_EVENT',
    });
  }

  const method = (event.method || 'GET').toUpperCase();
  const rawUrl = event.url || '';
  const pathname = event.pathname || '/';

  // 1. Query parameters
  let queryParams = [];
  if (Array.isArray(event.queryParams) && event.queryParams.length > 0) {
    queryParams = event.queryParams.map((p) => ({
      key: p.key ?? '',
      value: p.value ?? '',
      enabled: true,
    }));
  } else if (rawUrl.includes('?')) {
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.forEach((value, key) => {
        queryParams.push({ key, value, enabled: true });
      });
    } catch {
      // Ignore
    }
  }

  // 2. Headers sanitization
  const rawHeaders = event.requestHeaders || {};
  const { safeHeaders, redactedHeaders, excludedHeaders } = sanitizeHeaders(rawHeaders);

  // 3. Body sanitization
  const contentType =
    rawHeaders['content-type'] ||
    rawHeaders['Content-Type'] ||
    event.resourceType ||
    '';
  const { body, warnings: bodyWarnings } = sanitizeBody(event.postData, contentType);

  // 4. Security summary & warnings
  const warnings = [...bodyWarnings];
  if (redactedHeaders.length > 0) {
    warnings.push(
      `Security-sensitive credentials (${redactedHeaders.join(', ')}) were removed automatically.`
    );
  }
  if (excludedHeaders.length > 0) {
    warnings.push(
      `Browser-internal headers (${excludedHeaders.join(', ')}) were excluded.`
    );
  }
  warnings.push('Configure authentication manually in the API Client if needed.');

  const defaultName = `${method} ${pathname.length > 40 ? pathname.slice(0, 40) + '...' : pathname}`;

  return {
    request: {
      name: defaultName,
      method,
      url: rawUrl,
      pathname,
      hostname: event.hostname || '',
      resourceType: event.resourceType || 'fetch',
      queryParams,
      headers: safeHeaders,
      body,
    },
    security: {
      redactedHeaders,
      excludedHeaders,
      warnings,
    },
    metadata: {
      eventId: event.id,
      tabId: event.tabId,
      status: event.status,
      durationMs: event.durationMs,
      sizeBytes: event.sizeBytes,
      capturedAt: event.timestamp,
    },
  };
}

/**
 * Lookup captured event by ID and generate sanitized preview
 */
export function getCapturedRequestImportPreview(eventId) {
  const event = networkService.getNetworkEvent(eventId);
  if (!event) {
    throw new AppError('Captured network request not found or has expired', 404, {
      code: 'CAPTURED_REQUEST_NOT_FOUND',
    });
  }

  return generateImportPreview(event);
}

export default {
  isSensitiveHeader,
  isBrowserInternalHeader,
  sanitizeHeaders,
  sanitizeBody,
  generateImportPreview,
  getCapturedRequestImportPreview,
};

