/**
 * Utilities for sanitizing and converting captured browser network requests
 * into APIForge request configurations
 */

const SENSITIVE_HEADERS = new Set([
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

export function isSensitiveHeader(key = '') {
  const lower = String(key).toLowerCase().trim();
  if (SENSITIVE_HEADERS.has(lower)) return true;
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

export function isBrowserInternalHeader(key = '') {
  const lower = String(key).toLowerCase().trim();
  if (BROWSER_INTERNAL_HEADERS.has(lower)) return true;
  if (lower.startsWith('sec-')) return true;
  return false;
}

export function classifyHeaders(rawHeaders = {}) {
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

export function generateDefaultRequestName(method = 'GET', pathname = '/') {
  const m = (method || 'GET').toUpperCase();
  const cleanPath = pathname && pathname !== '/' ? pathname : '';
  if (!cleanPath) return `${m} Root Endpoint`;
  const truncated = cleanPath.length > 35 ? cleanPath.slice(0, 35) + '...' : cleanPath;
  return `${m} ${truncated}`;
}

export function sanitizeCapturedBody(postData, contentType = '') {
  const ct = String(contentType).toLowerCase();

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

  // JSON
  if (ct.includes('application/json') || (postData.trim().startsWith('{') && postData.trim().endsWith('}'))) {
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

  // Form urlencoded
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

  // Multipart form data
  if (ct.includes('multipart/form-data')) {
    warnings.push('Multipart form files were omitted for security.');
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
 * Client-side conversion fallback for a captured network event DTO
 */
export function convertCapturedEventToRequestPreview(event) {
  if (!event) return null;

  const method = (event.method || 'GET').toUpperCase();
  const rawUrl = event.url || '';
  const pathname = event.pathname || '/';

  // 1. Query Params
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

  // 2. Headers
  const rawHeaders = event.requestHeaders || {};
  const { safeHeaders, redactedHeaders, excludedHeaders } = classifyHeaders(rawHeaders);

  // 3. Body
  const contentType = rawHeaders['content-type'] || rawHeaders['Content-Type'] || event.resourceType || '';
  const { body, warnings: bodyWarnings } = sanitizeCapturedBody(event.postData, contentType);

  // 4. Security warnings
  const warnings = [...bodyWarnings];
  if (redactedHeaders.length > 0) {
    warnings.push(
      `Security-sensitive credentials (${redactedHeaders.join(', ')}) were removed automatically.`
    );
  }
  if (excludedHeaders.length > 0) {
    warnings.push(`Browser-internal headers (${excludedHeaders.join(', ')}) were excluded.`);
  }
  warnings.push('Configure authentication manually in the API Client if needed.');

  return {
    request: {
      name: generateDefaultRequestName(method, pathname),
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

export default {
  isSensitiveHeader,
  isBrowserInternalHeader,
  classifyHeaders,
  generateDefaultRequestName,
  sanitizeCapturedBody,
  convertCapturedEventToRequestPreview,
};

