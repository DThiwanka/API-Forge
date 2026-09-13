/**
 * JSONPath utilities for APIForge Response Inspector.
 * Generates and evaluates standardized JSONPaths consistent with
 * APIForge test assertions and variable extraction:
 * e.g. `$.user.id`, `$.items[0].name`, `$.headers["content-type"]`.
 */

const IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Builds a JSONPath string given parent path and current key/index.
 *
 * @param {string} parentPath - The parent path (e.g., "$", "$.user", "$.items[0]")
 * @param {string|number} key - The property key or array index
 * @param {boolean} [isParentArray=false] - Whether the parent node is an array
 * @returns {string} Fully qualified JSONPath string
 */
export function buildJsonPath(parentPath = '$', key, isParentArray = false) {
  const root = parentPath || '$';

  // Array index
  if (isParentArray || typeof key === 'number' || /^\d+$/.test(String(key))) {
    return `${root}[${key}]`;
  }

  const strKey = String(key);

  // Standard identifier -> dot notation (e.g., $.user or parent.property)
  if (IDENTIFIER_REGEX.test(strKey)) {
    return root === '$' ? `$.${strKey}` : `${root}.${strKey}`;
  }

  // Special characters, spaces, dashes -> bracket notation
  const escaped = strKey.replace(/"/g, '\\"');
  return `${root}["${escaped}"]`;
}

/**
 * Safely resolves a JSONPath string on a data object.
 *
 * @param {any} data - The target JSON object or array
 * @param {string} path - JSONPath string (e.g., "$.user.id" or "$.items[0]")
 * @returns {any} Resolved value or undefined if not found
 */
export function resolveJsonPath(data, path) {
  if (!path || typeof path !== 'string' || data === undefined || data === null) {
    return undefined;
  }

  const cleanPath = path.trim().replace(/^\$\.?/, '');
  if (!cleanPath) return data;

  // Split tokens respecting dots and bracket notations: [0] or ["key"]
  const tokens = [];
  const regex = /(?:\[(\d+)\]|\["([^"]+)"\]|\[\\'([^\\']+)\\'\]|([a-zA-Z0-9_$]+))/g;
  let match;

  while ((match = regex.exec(cleanPath)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(Number(match[1])); // Array index
    } else if (match[2] !== undefined) {
      tokens.push(match[2]); // Quoted key double quotes
    } else if (match[3] !== undefined) {
      tokens.push(match[3]); // Quoted key single quotes
    } else if (match[4] !== undefined) {
      tokens.push(match[4]); // Dot property
    }
  }

  let curr = data;
  for (const token of tokens) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[token];
  }

  return curr;
}

/**
 * Fast node counter with limit protection to prevent tree renderer
 * from locking the main thread on massive JSON payloads.
 *
 * @param {any} data - Object or array to inspect
 * @param {number} maxNodes - Maximum nodes to count before aborting
 * @returns {number} Node count up to maxNodes + 1
 */
export function countJsonNodes(data, maxNodes = 10000) {
  let count = 0;
  const stack = [data];

  while (stack.length > 0) {
    count++;
    if (count > maxNodes) return count;

    const current = stack.pop();
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        for (let i = current.length - 1; i >= 0; i--) {
          stack.push(current[i]);
        }
      } else {
        const values = Object.values(current);
        for (let i = values.length - 1; i >= 0; i--) {
          stack.push(values[i]);
        }
      }
    }
  }

  return count;
}

export default {
  buildJsonPath,
  resolveJsonPath,
  countJsonNodes,
};

