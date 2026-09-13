/**
 * Request Execution Utilities
 * 
 * Provides client-side pre-flight validation, execution error classification,
 * stack trace and secret sanitization, and troubleshooting guidance.
 */

import { validateJson } from './bodyUtils.js';
import { extractVariableNames } from './variableUtils.js';

/**
 * Sanitize error message to prevent exposure of server paths, stack traces, and internal tokens
 * 
 * @param {string} rawMessage 
 * @returns {string} Sanitized human-readable message
 */
export function sanitizeErrorMessage(rawMessage = '') {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'An unexpected error occurred during request execution.';
  }

  // Remove stack traces (e.g., lines with "at ...")
  let sanitized = rawMessage
    .split('\n')
    .filter((line) => !line.trim().startsWith('at ') && !line.includes('node_modules'))
    .join(' ')
    .trim();

  // Strip file paths like C:\...\file.js or /usr/.../file.js
  sanitized = sanitized.replace(/[a-zA-Z]:\\[^:\s]+/g, '[internal path]');
  sanitized = sanitized.replace(/\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]+/g, '[internal path]');

  return sanitized || 'Request execution failed.';
}

/**
 * Validate request draft before sending
 * 
 * @param {object} requestDraft
 * @param {string} requestDraft.url
 * @param {string} [requestDraft.method]
 * @param {object} [requestDraft.body]
 * @param {object} [options]
 * @param {string[]} [options.knownVariableKeys=[]]
 * @returns {{
 *   isValid: boolean,
 *   error: string | null,
 *   warnings: string[],
 *   undefinedVariables: string[]
 * }}
 */
export function validateRequestBeforeSend(requestDraft = {}, options = {}) {
  const { url = '', body = null } = requestDraft;
  const knownVariableKeys = Array.isArray(options.knownVariableKeys)
    ? new Set(options.knownVariableKeys)
    : new Set();

  const warnings = [];

  // 1. Missing or whitespace-only URL
  if (!url || !url.trim()) {
    return {
      isValid: false,
      error: 'Please enter a request URL before sending.',
      warnings: [],
      undefinedVariables: [],
    };
  }

  const trimmedUrl = url.trim();

  // 2. Protocol check (allow {{variable}} prefixes)
  const hasProtocol =
    trimmedUrl.startsWith('http://') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('{{');

  if (!hasProtocol) {
    warnings.push('URL does not specify a protocol (http:// or https://).');
  }

  // 3. Body validation if JSON mode is active
  if (body?.mode === 'json' && body.raw && body.raw.trim()) {
    const jsonValidation = validateJson(body.raw);
    if (!jsonValidation.valid) {
      const coordStr =
        jsonValidation.line && jsonValidation.column
          ? ` (line ${jsonValidation.line}, col ${jsonValidation.column})`
          : '';
      return {
        isValid: false,
        error: `Invalid JSON in request body${coordStr}: ${jsonValidation.error}`,
        warnings,
        undefinedVariables: [],
      };
    }
  }

  // 4. Check for undefined variables in URL
  const urlVariables = extractVariableNames(trimmedUrl);
  const undefinedVariables = urlVariables.filter((v) => !knownVariableKeys.has(v));
  if (undefinedVariables.length > 0) {
    warnings.push(
      `${undefinedVariables.length} variable${undefinedVariables.length > 1 ? 's are' : ' is'} undefined: ${undefinedVariables.map((v) => `{{${v}}}`).join(', ')}`
    );
  }

  return {
    isValid: true,
    error: null,
    warnings,
    undefinedVariables,
  };
}

/**
 * Classify client-side or backend execution errors into standardized categories
 * 
 * @param {Error|any} err
 * @returns {{
 *   type: 'TIMEOUT' | 'SECURITY' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN',
 *   title: string,
 *   message: string,
 *   status: number,
 *   suggestions: string[]
 * }}
 */
export function classifyClientExecutionError(err) {
  if (!err) {
    return {
      type: 'UNKNOWN',
      title: 'Execution Failed',
      message: 'An unknown error occurred during request execution.',
      status: 0,
      suggestions: ['Check your request configuration and retry.'],
    };
  }

  const responseData = err.response?.data;
  const status = err.response?.status || err.status || 0;
  const rawMsg =
    responseData?.message ||
    responseData?.error?.message ||
    err.message ||
    'Execution failed';

  const cleanMessage = sanitizeErrorMessage(rawMsg);
  const lowerMsg = cleanMessage.toLowerCase();
  const errorCode = (err.code || '').toUpperCase();

  // 1. TIMEOUT
  if (
    status === 504 ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('timeout') ||
    errorCode === 'ECONNABORTED' ||
    errorCode === 'ETIMEDOUT' ||
    err.name === 'AbortError'
  ) {
    return {
      type: 'TIMEOUT',
      title: 'Request Timed Out',
      message: cleanMessage,
      status: 504,
      suggestions: [
        'The destination server took too long to respond.',
        'Verify that the destination host is reachable and accepting traffic.',
        'Increase the request timeout under Request Settings if the endpoint is naturally slow.',
      ],
    };
  }

  // 2. SECURITY / SSRF
  if (
    status === 403 ||
    lowerMsg.includes('ssrf') ||
    lowerMsg.includes('private ip') ||
    lowerMsg.includes('restricted') ||
    lowerMsg.includes('blocked') ||
    lowerMsg.includes('security policy') ||
    lowerMsg.includes('forbidden target')
  ) {
    return {
      type: 'SECURITY',
      title: 'Destination Blocked by Security Policy',
      message: cleanMessage,
      status: 403,
      suggestions: [
        'APIForge enforces SSRF protection to prevent unauthorized internal network access.',
        'Requests to private IP ranges (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12) and cloud metadata services (169.254.169.254) are rejected.',
        'Verify that your destination URL points to an allowable public hostname.',
      ],
    };
  }

  // 3. NETWORK / DNS
  if (
    lowerMsg.includes('network error') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('connection refused') ||
    errorCode === 'ERR_NETWORK' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('econnrefused') ||
    status === 502
  ) {
    return {
      type: 'NETWORK',
      title: 'Network Connection Failed',
      message: cleanMessage,
      status: status || 502,
      suggestions: [
        'Could not establish a network connection to the target server.',
        'Check that the domain name or host is spelled correctly.',
        'Verify your internet or VPN connection.',
        'Ensure the remote server is active and listening on the requested port.',
      ],
    };
  }

  // 4. VALIDATION
  if (
    status === 400 ||
    lowerMsg.includes('validation') ||
    lowerMsg.includes('unresolved variable') ||
    lowerMsg.includes('invalid url') ||
    lowerMsg.includes('cannot be resolved')
  ) {
    return {
      type: 'VALIDATION',
      title: 'Request Validation Error',
      message: cleanMessage,
      status: 400,
      suggestions: [
        'Ensure the URL is well-formed with a valid protocol (http:// or https://).',
        'Verify that all {{templateVariables}} referenced in the URL, headers, and body exist in your active environment.',
        'Check that the request method and body format match API specifications.',
      ],
    };
  }

  // 5. UNKNOWN
  return {
    type: 'UNKNOWN',
    title: 'Request Execution Failed',
    message: cleanMessage,
    status: status || 500,
    suggestions: [
      'An unexpected error occurred while executing the request.',
      'Check the browser developer console or backend logs for details.',
      'Verify that the APIForge backend service is running and healthy.',
    ],
  };
}

export default {
  sanitizeErrorMessage,
  validateRequestBeforeSend,
  classifyClientExecutionError,
};

