const FORBIDDEN_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Safely resolve a JSON path expression against a target object or array.
 * Supports dot notation, bracket notation for array indexing, and .length.
 * Guarantees zero code execution and guards against prototype pollution.
 * 
 * @param {any} target - The JSON body or object to evaluate
 * @param {string} path - The path expression (e.g., "data.user.email", "items[0].id", "items.length")
 * @returns {{ found: boolean, value: any }}
 */
export function resolveJsonPath(target, path) {
  if (target === null || target === undefined || typeof path !== 'string') {
    return { found: false, value: undefined };
  }

  const cleanPath = path.trim();
  if (cleanPath.length === 0) {
    return { found: false, value: undefined };
  }

  // Normalize bracket notation e.g., items[0] -> items.0
  const normalizedPath = cleanPath.replace(/\[(\d+)\]/g, '.$1');

  // Split on dot notation
  const tokens = normalizedPath
    .split('.')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  let current = target;

  for (const token of tokens) {
    if (FORBIDDEN_PROPERTIES.has(token)) {
      return { found: false, value: undefined };
    }

    if (current === null || current === undefined || typeof current !== 'object') {
      return { found: false, value: undefined };
    }

    // Special handling for .length on arrays and strings
    if (token === 'length') {
      if (Array.isArray(current) || typeof current === 'string') {
        current = current.length;
        continue;
      }
    }

    if (Array.isArray(current)) {
      const idx = Number(token);
      if (Number.isInteger(idx) && idx >= 0 && idx < current.length) {
        current = current[idx];
        continue;
      }
      return { found: false, value: undefined };
    }

    if (Object.prototype.hasOwnProperty.call(current, token)) {
      current = current[token];
    } else {
      return { found: false, value: undefined };
    }
  }

  return { found: true, value: current };
}

export default {
  resolveJsonPath,
};

