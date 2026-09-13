/**
 * URL and Query Parameter Synchronization Utilities
 * 
 * Guarantees safe parsing, building, and synchronization of URLs and query parameters
 * while strictly preserving unresolved template variables like `{{variable}}`.
 */

export const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'apikey',
  'cookie',
  'set-cookie',
  'token',
  'x-auth-token',
  'secret',
  'private-token',
]);

/**
 * Split URL into base path, query string, and hash fragment
 * 
 * @param {string} fullUrl 
 * @returns {{ baseUrl: string, queryString: string, hash: string }}
 */
export function splitUrl(fullUrl = '') {
  if (!fullUrl || typeof fullUrl !== 'string') {
    return { baseUrl: '', queryString: '', hash: '' };
  }

  const hashIndex = fullUrl.indexOf('#');
  const urlWithoutHash = hashIndex !== -1 ? fullUrl.slice(0, hashIndex) : fullUrl;
  const hash = hashIndex !== -1 ? fullUrl.slice(hashIndex + 1) : '';

  const qIndex = urlWithoutHash.indexOf('?');
  const baseUrl = qIndex !== -1 ? urlWithoutHash.slice(0, qIndex) : urlWithoutHash;
  const queryString = qIndex !== -1 ? urlWithoutHash.slice(qIndex + 1) : '';

  return { baseUrl, queryString, hash };
}

/**
 * Decode URL component safely without crashing or corrupting template variables
 */
function safeDecode(str) {
  if (!str || typeof str !== 'string') return '';
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch {
    return str;
  }
}

/**
 * Parse a query string into a list of parameter rows.
 * Preserves `{{variable}}` templates as raw strings.
 * 
 * @param {string} queryString - e.g. "foo=bar&id={{userId}}&active"
 * @returns {Array<{ key: string, value: string, enabled: boolean, description: string }>}
 */
export function parseQueryString(queryString = '') {
  if (!queryString || typeof queryString !== 'string') {
    return [];
  }

  // Strip leading '?' if passed
  const cleanQs = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  if (!cleanQs.trim()) {
    return [];
  }

  const pairs = cleanQs.split('&');
  const results = [];

  for (const pair of pairs) {
    if (!pair) continue;
    const eqIndex = pair.indexOf('=');
    const rawKey = eqIndex === -1 ? pair : pair.slice(0, eqIndex);
    const rawValue = eqIndex === -1 ? '' : pair.slice(eqIndex + 1);

    const key = safeDecode(rawKey);
    const value = safeDecode(rawValue);

    results.push({
      key,
      value,
      enabled: true,
      description: '',
    });
  }

  return results;
}

/**
 * Serialize an array of query parameters into a query string.
 * Strictly preserves `{{variable}}` tokens without percent-encoding braces.
 * 
 * @param {Array<{ key: string, value: string, enabled?: boolean }>} queryParams
 * @returns {string} Query string without leading '?'
 */
export function buildQueryString(queryParams = []) {
  if (!Array.isArray(queryParams) || queryParams.length === 0) {
    return '';
  }

  const parts = [];

  for (const p of queryParams) {
    if (!p || p.enabled === false) continue;
    const k = (p.key ?? '').trim();
    const v = p.value ?? '';

    // Ignore completely empty rows
    if (!k && !v) continue;

    if (k && v !== '') {
      parts.push(`${k}=${v}`);
    } else if (k) {
      parts.push(k);
    } else if (v !== '') {
      parts.push(`=${v}`);
    }
  }

  return parts.join('&');
}

/**
 * Merge base URL with query parameters array.
 * Replaces any existing query string in the URL with the serialized query parameters.
 * 
 * @param {string} currentUrl 
 * @param {Array<{ key: string, value: string, enabled?: boolean }>} queryParams
 * @returns {string} Merged URL
 */
export function mergeUrlAndQueryParams(currentUrl = '', queryParams = []) {
  const { baseUrl, hash } = splitUrl(currentUrl);
  const qs = buildQueryString(queryParams);
  const hashPart = hash ? `#${hash}` : '';

  if (!qs) {
    return `${baseUrl}${hashPart}`;
  }

  return `${baseUrl}?${qs}${hashPart}`;
}

/**
 * Synchronize URL changes to query parameter list.
 * Preserves descriptions and disabled parameters from the previous queryParams list.
 * 
 * @param {string} newUrl 
 * @param {Array<{ key: string, value: string, enabled?: boolean, description?: string }>} existingParams 
 * @returns {Array<{ key: string, value: string, enabled: boolean, description: string }>}
 */
export function syncUrlToQueryParams(newUrl = '', existingParams = []) {
  const { queryString } = splitUrl(newUrl);
  const parsed = parseQueryString(queryString);

  // Index existing parameters by key for preserving descriptions and disabled items
  const descByKey = new Map();
  const disabledParams = [];

  if (Array.isArray(existingParams)) {
    for (const p of existingParams) {
      if (!p) continue;
      if (p.enabled === false && p.key?.trim()) {
        disabledParams.push({ ...p });
      }
      if (p.description && p.key?.trim() && !descByKey.has(p.key.trim())) {
        descByKey.set(p.key.trim(), p.description);
      }
    }
  }

  const result = parsed.map((item) => ({
    key: item.key,
    value: item.value,
    enabled: true,
    description: descByKey.get(item.key.trim()) || item.description || '',
  }));

  // Re-append disabled parameters that weren't in the active URL
  for (const disabled of disabledParams) {
    result.push(disabled);
  }

  if (result.length === 0) {
    return [{ key: '', value: '', enabled: true, description: '' }];
  }

  return result;
}

/**
 * Detect duplicate keys among enabled items.
 * 
 * @param {Array<{ key: string, enabled?: boolean }>} items 
 * @param {boolean} [caseInsensitive=false] 
 * @returns {Set<string>} Set of duplicate key names (lowercase if caseInsensitive)
 */
export function findDuplicateKeys(items = [], caseInsensitive = false) {
  const duplicates = new Set();
  const seen = new Set();

  if (!Array.isArray(items)) return duplicates;

  for (const item of items) {
    if (!item || item.enabled === false) continue;
    const rawKey = item.key ? String(item.key).trim() : '';
    if (!rawKey) continue;

    const normalized = caseInsensitive ? rawKey.toLowerCase() : rawKey;
    if (seen.has(normalized)) {
      duplicates.add(normalized);
    } else {
      seen.add(normalized);
    }
  }

  return duplicates;
}

/**
 * Check if a header name is considered sensitive (auth token, api key, cookie, etc.)
 * 
 * @param {string} headerName 
 * @returns {boolean}
 */
export function isSensitiveHeader(headerName = '') {
  if (!headerName || typeof headerName !== 'string') return false;
  const lower = headerName.trim().toLowerCase();
  if (SENSITIVE_HEADER_NAMES.has(lower)) return true;
  return lower.includes('token') || lower.includes('secret') || lower.includes('auth') || lower.includes('apikey');
}

/**
 * Safely mask sensitive header values for display or preview.
 * 
 * @param {string} key - Header key
 * @param {string} value - Header value
 * @returns {string} Masked value if sensitive, or original value
 */
export function maskSensitiveHeaderValue(key = '', value = '') {
  if (!value || typeof value !== 'string') return value ?? '';
  if (!isSensitiveHeader(key)) return value;

  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return 'Bearer ••••••••';
  }
  if (trimmed.toLowerCase().startsWith('basic ')) {
    return 'Basic ••••••••';
  }
  return '••••••••';
}

export default {
  splitUrl,
  parseQueryString,
  buildQueryString,
  mergeUrlAndQueryParams,
  syncUrlToQueryParams,
  findDuplicateKeys,
  isSensitiveHeader,
  maskSensitiveHeaderValue,
  SENSITIVE_HEADER_NAMES,
};
