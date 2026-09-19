/**
 * Centralized Redaction & Sensitive-Data Protection Utilities for APIForge (Server)
 * 
 * Provides consistent, deterministic redaction of sensitive credentials across
 * headers, URLs, query parameters, error messages, and assertion results.
 */

export const REDACTED_TEXT = '[REDACTED]';
export const MASKED_TEXT = '••••••••';

export const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'proxy-authorization',
  'x-api-key',
  'apikey',
  'x-auth-token',
  'x-access-token',
  'token',
  'secret',
  'password',
  'client-secret',
  'x-csrf-token',
  'x-xsrf-token',
]);

export const SENSITIVE_PARAM_REGEX =
  /^(token|access_token|api_key|apikey|key|secret|password|signature|auth|authorization|client_secret|refresh_token)$/i;

export const SENSITIVE_KEY_REGEX =
  /(authorization|cookie|set-cookie|x[_-]?api[_-]?key|api[_-]?key|apikey|x[_-]?auth[_-]?token|token|secret|password|client[_-]?secret|signature)/i;

/**
 * Check if a header name is considered sensitive
 * @param {string} headerName
 * @returns {boolean}
 */
export function isSensitiveHeader(headerName) {
  if (!headerName || typeof headerName !== 'string') return false;
  const lower = headerName.toLowerCase().trim();
  if (SENSITIVE_HEADER_KEYS.has(lower)) return true;
  return (
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('api-key') ||
    lower.includes('apikey')
  );
}

/**
 * Check if a query parameter name is considered sensitive
 * @param {string} paramName
 * @returns {boolean}
 */
export function isSensitiveQueryParam(paramName) {
  if (!paramName || typeof paramName !== 'string') return false;
  const trimmed = paramName.trim();
  return SENSITIVE_PARAM_REGEX.test(trimmed);
}

/**
 * Check if an arbitrary key name indicates sensitive credential content
 * @param {string} key
 * @returns {boolean}
 */
export function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false;
  return SENSITIVE_KEY_REGEX.test(key.trim());
}

/**
 * Redact sensitive headers in an object map
 * @param {Record<string, any>} headers
 * @param {string} [placeholder=REDACTED_TEXT]
 * @returns {Record<string, string>}
 */
export function redactHeaders(headers, placeholder = REDACTED_TEXT) {
  if (!headers || typeof headers !== 'object') return {};
  const redacted = {};
  for (const [key, value] of Object.entries(headers)) {
    if (isSensitiveHeader(key)) {
      redacted[key] = placeholder;
    } else {
      redacted[key] = typeof value === 'string' ? value : String(value ?? '');
    }
  }
  return redacted;
}

/**
 * Redact an array of query parameter objects [{ key, value, enabled }]
 * @param {Array<object>} queryParams
 * @param {string} [placeholder=REDACTED_TEXT]
 * @returns {Array<object>}
 */
export function redactQueryParams(queryParams = [], placeholder = REDACTED_TEXT) {
  if (!Array.isArray(queryParams)) return [];
  return queryParams.map((p) => {
    if (!p || typeof p !== 'object') return p;
    if (p.key && isSensitiveQueryParam(p.key)) {
      return { ...p, value: placeholder };
    }
    return p;
  });
}

/**
 * Redact credentials in a URL:
 * 1. Passwords in URL authority (e.g., https://user:pass@host)
 * 2. Sensitive query parameters (e.g., ?api_key=xyz -> ?api_key=[REDACTED])
 * 3. Secret environment values present anywhere in the URL string
 * 
 * @param {string} url - Raw or interpolated URL
 * @param {Array<string>} [secretValues=[]] - Known secret environment values
 * @param {string} [placeholder=REDACTED_TEXT]
 * @returns {string} Sanitized URL
 */
export function redactUrl(url, secretValues = [], placeholder = REDACTED_TEXT) {
  if (!url || typeof url !== 'string') return '';
  let sanitized = url.trim();

  // 1. Redact credentials in authority
  try {
    const parsed = new URL(sanitized);
    let modified = false;
    if (parsed.password) {
      parsed.password = placeholder;
      modified = true;
    }

    // 2. Redact sensitive query parameters in URL search
    if (parsed.search) {
      const keysToRedact = [];
      parsed.searchParams.forEach((val, key) => {
        if (isSensitiveQueryParam(key)) {
          keysToRedact.push(key);
        }
      });

      for (const key of keysToRedact) {
        parsed.searchParams.set(key, placeholder);
        modified = true;
      }
    }

    if (modified) {
      const encodedPlaceholder = encodeURIComponent(placeholder);
      sanitized = parsed.toString().split(encodedPlaceholder).join(placeholder);
    }
  } catch {
    // Non-standard, incomplete, or templated URL fallback
    sanitized = sanitized.replace(/(\/\/[^:]+:)([^@]+)(@)/, `$1${placeholder}$3`);

    // Match query parameter patterns e.g. (?|&)(api_key|token|...)=([^&#\s]+)
    sanitized = sanitized.replace(
      /([?&])(token|access_token|api_key|apikey|key|secret|password|signature|auth|authorization|client_secret|refresh_token)=([^&#\s]*)/gi,
      `$1$2=${placeholder}`
    );
  }

  // 3. Mask known secret environment variable values
  if (Array.isArray(secretValues)) {
    for (const secret of secretValues) {
      if (!secret || typeof secret !== 'string' || secret.trim().length === 0) continue;
      // Skip if secret happens to match placeholder
      if (secret === placeholder || secret === MASKED_TEXT) continue;
      sanitized = sanitized.split(secret).join(placeholder);
      const encoded = encodeURIComponent(secret);
      if (encoded !== secret) {
        sanitized = sanitized.split(encoded).join(placeholder);
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize execution error message:
 * Removes bearer tokens, passwords, secrets, cookies, internal paths, SQL fragments, and stack traces.
 * 
 * @param {string} rawMessage
 * @param {Array<string>} [secretValues=[]]
 * @param {string} [placeholder=REDACTED_TEXT]
 * @returns {string} Safe error message
 */
export function redactErrorMessage(rawMessage = '', secretValues = [], placeholder = REDACTED_TEXT) {
  if (!rawMessage || typeof rawMessage !== 'string') return '';
  let sanitized = rawMessage.trim();

  // Strip known secret values
  if (Array.isArray(secretValues)) {
    for (const secret of secretValues) {
      if (!secret || typeof secret !== 'string' || secret.trim().length === 0) continue;
      if (secret === placeholder || secret === MASKED_TEXT) continue;
      sanitized = sanitized.split(secret).join(placeholder);
    }
  }

  // Check for internal stack traces or database errors
  const hasStackTrace =
    /\bat\s+.*:\d+:\d+/i.test(sanitized) ||
    /\bat\s+[a-zA-Z0-9_$.<>]+\s*\(/i.test(sanitized) ||
    sanitized.includes('node_modules');
  const hasSqlError =
    /\b(SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i.test(sanitized) ||
    /\b(PrismaClient|syntax error at or near|SequelizeDatabaseError|QueryFailedError)\b/i.test(sanitized);

  if (hasStackTrace || hasSqlError) {
    return 'An internal execution error occurred. Please try again.';
  }

  // Redact Bearer tokens e.g. "Bearer eyJhbGciOi..."
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, `Bearer ${placeholder}`);

  // Redact password / token assignments e.g. password=xyz, token=abc
  sanitized = sanitized.replace(
    /(password|secret|token|api[_-]?key|apikey)\s*[:=]\s*([^\s,;&"']+)/gi,
    `$1=${placeholder}`
  );

  // Redact filesystem paths
  sanitized = sanitized
    .replace(/[a-zA-Z]:\\[^:\s]+/g, '[PATH]')
    .replace(/\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+/g, '[PATH]');

  return sanitized.trim();
}

/**
 * Sanitize assertion result so sensitive values and headers are not leaked in actualValue or message
 * 
 * @param {object} result - Single assertion evaluation result
 * @param {string} [placeholder=REDACTED_TEXT]
 * @returns {object} Sanitized assertion result
 */
export function sanitizeAssertionResult(result, placeholder = REDACTED_TEXT) {
  if (!result || typeof result !== 'object') return result;

  const safePlaceholder = typeof placeholder === 'string' ? placeholder : REDACTED_TEXT;

  const type = (result.type || '').toLowerCase();
  const path = (result.path || '');

  const isSensitive =
    (type === 'header' && isSensitiveHeader(path)) ||
    (type === 'json_path' && isSensitiveKey(path)) ||
    (type === 'json_body' && isSensitiveKey(path)) ||
    isSensitiveHeader(path) ||
    isSensitiveKey(path);

  if (!isSensitive) return result;

  const safeActual =
    result.actualValue !== null && result.actualValue !== undefined
      ? safePlaceholder
      : null;

  let safeMessage = result.message;
  if (typeof safeMessage === 'string' && result.actualValue && typeof result.actualValue === 'string') {
    safeMessage = safeMessage.split(result.actualValue).join(safePlaceholder);
  } else if (typeof safeMessage === 'string') {
    safeMessage = safeMessage
      .replace(/to equal ".*?"/, `to equal "${safePlaceholder}"`)
      .replace(/got ".*?"/, `got "${safePlaceholder}"`)
      .replace(/value: ".*?"/, `value: "${safePlaceholder}"`)
      .replace(
        /Expected '.*?' not to exist, but found value: .*/,
        'Expected sensitive field not to exist, but it was found'
      );
  }

  return {
    ...result,
    actualValue: safeActual,
    expectedValue:
      result.expectedValue !== null && result.expectedValue !== undefined
        ? safePlaceholder
        : null,
    message: safeMessage,
  };
}

export default {
  REDACTED_TEXT,
  MASKED_TEXT,
  SENSITIVE_HEADER_KEYS,
  SENSITIVE_PARAM_REGEX,
  SENSITIVE_KEY_REGEX,
  isSensitiveHeader,
  isSensitiveQueryParam,
  isSensitiveKey,
  redactHeaders,
  redactQueryParams,
  redactUrl,
  redactErrorMessage,
  sanitizeAssertionResult,
};
