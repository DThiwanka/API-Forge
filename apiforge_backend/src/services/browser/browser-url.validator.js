import { AppError } from '../../utils/appError.js';
import { validateTargetUrl } from '../execution/ssrf-protection.service.js';

const DISALLOWED_PROTOCOLS = new Set([
  'file:',
  'javascript:',
  'data:',
  'blob:',
  'about:',
  'chrome:',
  'devtools:',
  'view-source:',
  'ftp:',
  'ws:',
  'wss:',
]);

/**
 * Normalizes user-entered browser URLs.
 * If no scheme is present, defaults to https://.
 *
 * @param {string} input
 * @returns {string}
 */
export function normalizeBrowserUrl(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let cleaned = input.trim();

  // If already starts with a protocol scheme
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(cleaned)) {
    return cleaned;
  }

  // If starts with // (protocol-relative)
  if (cleaned.startsWith('//')) {
    return `https:${cleaned}`;
  }

  // Otherwise default to https://
  return `https://${cleaned}`;
}

/**
 * Validates a browser URL for safe navigation:
 * - Strictly allows http: and https:
 * - Rejects file:, javascript:, data:, blob:, chrome:, etc.
 * - Rejects embedded credentials
 * - Enforces SSRF protections (blocking localhost, loopback, private IPv4/IPv6, cloud metadata)
 *
 * @param {string} rawUrl
 * @param {object} [options={}]
 * @param {boolean} [options.allowLocalTargets=false]
 * @returns {Promise<{ valid: boolean, url: string, parsed: URL }>}
 */
export async function validateBrowserUrl(rawUrl, options = {}) {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
    throw new AppError('A valid URL is required for browser navigation', 400, {
      code: 'INVALID_BROWSER_URL',
    });
  }

  const normalized = normalizeBrowserUrl(rawUrl);

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new AppError(`Invalid URL format: '${rawUrl}'`, 400, {
      code: 'INVALID_BROWSER_URL',
    });
  }

  const protocol = parsed.protocol.toLowerCase();

  // Check disallowed protocols explicitly
  if (DISALLOWED_PROTOCOLS.has(protocol)) {
    throw new AppError(
      `Navigation to '${protocol}' URLs is blocked for security reasons. Only 'http:' and 'https:' are allowed.`,
      400,
      { code: 'BLOCKED_BROWSER_URL' }
    );
  }

  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new AppError(
      `Unsupported protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`,
      400,
      { code: 'INVALID_BROWSER_URL' }
    );
  }

  // Reject embedded credentials in URL
  if (parsed.username || parsed.password) {
    throw new AppError(
      'Embedded credentials in URLs are blocked for security reasons',
      400,
      { code: 'BLOCKED_BROWSER_URL' }
    );
  }

  // Use core SSRF protection (DNS resolution + private IP subnet verification)
  try {
    await validateTargetUrl(normalized, options);
  } catch (err) {
    throw new AppError(
      err.message || 'Target destination is blocked by security policy',
      400,
      { code: 'BLOCKED_BROWSER_URL' }
    );
  }

  return {
    valid: true,
    url: normalized,
    parsed,
  };
}
