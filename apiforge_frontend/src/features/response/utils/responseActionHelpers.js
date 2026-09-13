/**
 * Response-to-Request Debugging Action Helpers for APIForge.
 * Formats values, suggests variable names, and constructs test assertion payloads.
 */

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Convert string segment from snake_case or kebab-case to camelCase
function toCamelCase(str) {
  if (!str) return '';
  return str
    .replace(/[-_]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ''))
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase());
}

function singularize(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('s') && str.length > 3 && !str.endsWith('ss')) return str.slice(0, -1);
  return str;
}

/**
 * Suggests a clean, idiomatic variable name from a JSONPath string.
 *
 * Examples:
 * - `$.user.id` -> `userId`
 * - `$.access_token` -> `accessToken`
 * - `$.data.user.email` -> `email`
 * - `$.items[0].id` -> `itemId`
 * - `$.token` -> `token`
 * - `$.headers["content-type"]` -> `contentType`
 *
 * @param {string} jsonPath - Target JSONPath
 * @returns {string} Suggested camelCase variable name
 */
export function suggestVariableName(jsonPath) {
  if (!jsonPath || typeof jsonPath !== 'string') {
    return 'extractedVar';
  }

  // Clean path: strip leading $, dots, quotes, and array brackets
  const clean = jsonPath
    .replace(/^\$\.?/, '')
    .replace(/\["([^"]+)"\]/g, '.$1')
    .replace(/\['([^']+)'\]/g, '.$1')
    .replace(/\[\d+\]/g, ''); // strip array index [0]

  const rawSegments = clean
    .split('.')
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSegments.length === 0) {
    return 'extractedVar';
  }

  // Filter out overly generic envelope keys if more specific tokens follow
  const genericEnvelopes = new Set([
    'data',
    'attributes',
    'result',
    'results',
    'payload',
    'response',
    'body',
  ]);

  let segments = rawSegments;
  if (segments.length > 1 && genericEnvelopes.has(segments[0].toLowerCase())) {
    segments = segments.slice(1);
  }

  let resultName;

  if (segments.length === 1) {
    resultName = toCamelCase(segments[0]);
  } else if (segments.length === 2) {
    const parent = singularize(toCamelCase(segments[0]));
    const child = toCamelCase(segments[1]);

    if (child.toLowerCase() === 'id' || child.toLowerCase() === 'key') {
      // e.g. user + id -> userId, users + id -> userId, items + id -> itemId
      resultName = `${parent}${child.charAt(0).toUpperCase()}${child.slice(1)}`;
    } else {
      resultName = child;
    }
  } else {
    // 3 or more segments, e.g. ['user', 'profile', 'email'] -> 'email'
    const last = toCamelCase(segments[segments.length - 1]);
    const secondLast = singularize(toCamelCase(segments[segments.length - 2]));

    if (last.toLowerCase() === 'id' || last.toLowerCase() === 'key') {
      resultName = `${secondLast}${last.charAt(0).toUpperCase()}${last.slice(1)}`;
    } else {
      resultName = last;
    }
  }

  // Fallback check
  if (!resultName || !IDENTIFIER_REGEX.test(resultName)) {
    resultName = 'extractedVar';
  }

  return resultName;
}

/**
 * Formats a selected JSON node value for copying or assertions.
 * Handles strings, numbers, booleans, null, and objects without "[object Object]".
 *
 * @param {any} value - Value to format
 * @returns {string} String representation
 */
export function formatPrimitiveValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Constructs an assertion payload for response status.
 */
export function buildStatusAssertion(status = 200) {
  return {
    type: 'status',
    operator: 'equals',
    path: null,
    expectedValue: String(status || 200),
  };
}

/**
 * Constructs an assertion payload for response round-trip duration.
 */
export function buildResponseTimeAssertion(timeMs) {
  let threshold = 500;
  if (typeof timeMs === 'number' && timeMs > 0) {
    threshold = Math.max(500, Math.ceil((timeMs * 1.5) / 50) * 50);
  }
  return {
    type: 'response_time',
    operator: 'less_than',
    path: null,
    expectedValue: String(threshold),
  };
}

/**
 * Constructs an assertion payload for a response header.
 */
export function buildHeaderAssertion(headerKey, headerVal) {
  return {
    type: 'header',
    operator: 'equals',
    path: String(headerKey || '').toLowerCase(),
    expectedValue: String(headerVal || ''),
  };
}

/**
 * Constructs an assertion payload for a JSONPath node.
 * Falsy values like `0`, `false`, and `""` are preserved as valid expected values.
 */
export function buildJsonPathAssertion(jsonPath, value) {
  const isValuePresent = value !== null && value !== undefined;
  const isObject = isValuePresent && typeof value === 'object';

  if (!isValuePresent || isObject) {
    return {
      type: 'json_path',
      operator: 'exists',
      path: jsonPath,
      expectedValue: '',
    };
  }

  return {
    type: 'json_path',
    operator: 'equals',
    path: jsonPath,
    expectedValue: formatPrimitiveValue(value),
  };
}

export default {
  suggestVariableName,
  formatPrimitiveValue,
  buildStatusAssertion,
  buildResponseTimeAssertion,
  buildHeaderAssertion,
  buildJsonPathAssertion,
};
