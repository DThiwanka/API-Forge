import { splitUrl, syncUrlToQueryParams } from '../../requests/utils/urlUtils.js';
import { extractVariableNames } from '../../requests/utils/variableUtils.js';

/**
 * Generate a clean, readable default request name from a URL.
 * e.g. "https://api.example.com/v1/users?page=2" -> "GET api.example.com/v1/users"
 * 
 * @param {string} url 
 * @param {string} [method='GET'] 
 * @returns {string}
 */
export function generateRequestNameFromUrl(url = '', method = 'GET') {
  if (!url || typeof url !== 'string') {
    return `${method.toUpperCase()} Request`;
  }

  const trimmed = url.trim();
  const { baseUrl } = splitUrl(trimmed);

  try {
    const parsed = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
    const host = parsed.hostname;
    let pathname = parsed.pathname;

    if (pathname === '/' || !pathname) {
      return `${method.toUpperCase()} ${host}`;
    }

    // Strip trailing slash for clean presentation
    if (pathname.endsWith('/') && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }

    return `${method.toUpperCase()} ${host}${pathname}`;
  } catch {
    const cleanBase = baseUrl.replace(/^https?:\/\//i, '').split('?')[0];
    return `${method.toUpperCase()} ${cleanBase || 'Request'}`;
  }
}

/**
 * In-memory search across cached collections to find any request with an exact matching URL.
 * Inexpensive and doesn't hit any backend search endpoint.
 * 
 * @param {Array<object>} collections 
 * @param {string} targetUrl 
 * @returns {{ request: object, collection: object } | null}
 */
export function findMatchingRequestInCollections(collections = [], targetUrl = '') {
  if (!Array.isArray(collections) || !targetUrl || typeof targetUrl !== 'string') {
    return null;
  }

  const cleanTarget = targetUrl.trim().toLowerCase();
  const { baseUrl: targetBase } = splitUrl(cleanTarget);

  for (const col of collections) {
    const requests = Array.isArray(col.requests) ? col.requests : [];
    for (const req of requests) {
      if (!req?.url) continue;
      const reqUrl = req.url.trim().toLowerCase();

      // Exact match (including query params)
      if (reqUrl === cleanTarget) {
        return { request: req, collection: col, exact: true };
      }

      // Base URL match if both URLs exist
      const { baseUrl: reqBase } = splitUrl(reqUrl);
      if (reqBase && targetBase && reqBase === targetBase) {
        return { request: req, collection: col, exact: false };
      }
    }
  }

  return null;
}

/**
 * Validate a target URL before sending to Browser Space.
 * Enforces client-side preflight SSRF protection, protocol restrictions,
 * and rejection of dangerous schemes.
 * 
 * @param {string} targetUrl 
 * @returns {{
 *   isValid: boolean,
 *   normalizedUrl: string,
 *   error: string | null,
 *   code: string | null
 * }}
 */
export function validateBrowserNavigationTarget(targetUrl = '') {
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
    return {
      isValid: false,
      normalizedUrl: '',
      error: 'URL is required for browser navigation',
      code: 'EMPTY_URL',
    };
  }

  let raw = targetUrl.trim();

  // Check dangerous schemes
  const lower = raw.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('about:') ||
    lower.startsWith('chrome:')
  ) {
    return {
      isValid: false,
      normalizedUrl: raw,
      error: 'Blocked URL protocol: Browser Space only permits http:// and https:// URLs.',
      code: 'DISALLOWED_PROTOCOL',
    };
  }

  // Prepend https:// if no protocol given
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      isValid: false,
      normalizedUrl: raw,
      error: 'Invalid URL format.',
      code: 'INVALID_URL',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      normalizedUrl: raw,
      error: 'Only http:// and https:// protocols are permitted.',
      code: 'DISALLOWED_PROTOCOL',
    };
  }

  // Check for embedded credentials
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      normalizedUrl: raw,
      error: 'URLs with embedded credentials (user:pass@host) are rejected for security.',
      code: 'EMBEDDED_CREDENTIALS',
    };
  }

  const rawHostname = parsed.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, '');

  // SSRF Protection: Localhost & loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  ) {
    return {
      isValid: false,
      normalizedUrl: raw,
      error: 'Destination blocked by security policy: Browser Space does not permit access to localhost or loopback addresses.',
      code: 'BLOCKED_SSRF_TARGET',
    };
  }

  // SSRF Protection: Cloud metadata services
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.includes('metadata.google')
  ) {
    return {
      isValid: false,
      normalizedUrl: raw,
      error: 'Destination blocked by security policy: Access to cloud metadata endpoints is strictly forbidden.',
      code: 'BLOCKED_SSRF_TARGET',
    };
  }

  // SSRF Protection: Private RFC1918 subnets
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const oct1 = parseInt(ipv4Match[1], 10);
    const oct2 = parseInt(ipv4Match[2], 10);

    // 10.0.0.0/8
    if (oct1 === 10) {
      return {
        isValid: false,
        normalizedUrl: raw,
        error: 'Destination blocked by security policy: Access to private networks (10.0.0.0/8) is forbidden.',
        code: 'BLOCKED_SSRF_TARGET',
      };
    }
    // 172.16.0.0/12 (172.16 - 172.31)
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
      return {
        isValid: false,
        normalizedUrl: raw,
        error: 'Destination blocked by security policy: Access to private networks (172.16.0.0/12) is forbidden.',
        code: 'BLOCKED_SSRF_TARGET',
      };
    }
    // 192.168.0.0/16
    if (oct1 === 192 && oct2 === 168) {
      return {
        isValid: false,
        normalizedUrl: raw,
        error: 'Destination blocked by security policy: Access to private networks (192.168.0.0/16) is forbidden.',
        code: 'BLOCKED_SSRF_TARGET',
      };
    }
    // 169.254.0.0/16 (link local)
    if (oct1 === 169 && oct2 === 254) {
      return {
        isValid: false,
        normalizedUrl: raw,
        error: 'Destination blocked by security policy: Access to link-local addresses (169.254.0.0/16) is forbidden.',
        code: 'BLOCKED_SSRF_TARGET',
      };
    }
  }

  return {
    isValid: true,
    normalizedUrl: raw,
    error: null,
    code: null,
  };
}

/**
 * Resolves template variables in a request URL for Browser Space navigation.
 * Never exposes secret values in UI warnings or logs.
 * 
 * @param {string} url 
 * @param {Map<string, object>} variableMap 
 * @param {object|null} activeEnv 
 * @returns {{
 *   resolvedUrl: string,
 *   unresolvedVariables: string[],
 *   hasUnresolved: boolean,
 *   containsSecret: boolean
 * }}
 */
export function resolveRequestUrlForBrowser(url = '', variableMap = new Map(), _activeEnv = null) {
  if (!url || typeof url !== 'string') {
    return {
      resolvedUrl: '',
      unresolvedVariables: [],
      hasUnresolved: false,
      containsSecret: false,
    };
  }

  const referencedVars = extractVariableNames(url);
  const unresolvedVariables = [];
  let containsSecret = false;

  let resolved = url;

  for (const varName of referencedVars) {
    const variable = variableMap.get(varName);

    if (!variable || variable.value === undefined || variable.value === null || variable.value === '') {
      unresolvedVariables.push(varName);
      continue;
    }

    if (variable.isSecret) {
      containsSecret = true;
    }

    // Replace all occurrences of {{varName}}
    const regex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
    resolved = resolved.replace(regex, variable.value);
  }

  return {
    resolvedUrl: resolved,
    unresolvedVariables,
    hasUnresolved: unresolvedVariables.length > 0,
    containsSecret,
  };
}

export { syncUrlToQueryParams };
