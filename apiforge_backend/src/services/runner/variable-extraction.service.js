import { resolveJsonPath } from '../testing/json-path.service.js';
import { VARIABLE_KEY_REGEX } from '../environments/variable.service.js';

export const MAX_EXTRACTION_RULES = 50;

export const EXTRACTION_SOURCES = {
  JSON: 'json',
  HEADER: 'header',
  TEXT: 'text',
};

const ALLOWED_SOURCES = new Set(Object.values(EXTRACTION_SOURCES));

/**
 * Validate a single extraction rule definition
 * 
 * @param {object} rule
 * @param {number} [index=0]
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validateExtractionRule(rule, index = 0) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    return `Extraction rule at index ${index} must be an object`;
  }

  // 1. Validate variable name
  const variable = typeof rule.variable === 'string' ? rule.variable.trim() : '';
  if (!variable) {
    return `Extraction rule at index ${index} missing 'variable' name`;
  }
  if (!VARIABLE_KEY_REGEX.test(variable)) {
    return `Extraction variable '${variable}' at index ${index} is invalid. Variable names must start with a letter or underscore and contain only alphanumeric characters and underscores.`;
  }

  // 2. Validate source
  const source = typeof rule.source === 'string' ? rule.source.trim().toLowerCase() : '';
  if (!source) {
    return `Extraction rule for variable '${variable}' missing 'source'`;
  }
  if (!ALLOWED_SOURCES.has(source)) {
    return `Extraction rule for variable '${variable}' has invalid source '${source}'. Allowed sources: json, header, text`;
  }

  // 3. Source-specific validation
  if (source === EXTRACTION_SOURCES.JSON) {
    const path = typeof rule.path === 'string' ? rule.path.trim() : '';
    if (!path) {
      return `JSON extraction rule for variable '${variable}' missing 'path' expression`;
    }
  } else if (source === EXTRACTION_SOURCES.HEADER) {
    const header = typeof (rule.header || rule.path) === 'string'
      ? (rule.header || rule.path).trim()
      : '';
    if (!header) {
      return `Header extraction rule for variable '${variable}' missing header name`;
    }
  }

  return null;
}

/**
 * Validate an array of extraction rules
 * 
 * @param {Array<object>} rules
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
 */
export function validateExtractionRules(rules) {
  const errors = [];

  if (!Array.isArray(rules)) {
    return {
      valid: false,
      errors: [{ field: 'extract', message: 'Extraction rules must be an array' }],
    };
  }

  if (rules.length > MAX_EXTRACTION_RULES) {
    return {
      valid: false,
      errors: [
        {
          field: 'extract',
          message: `Too many extraction rules (${rules.length}). Maximum allowed is ${MAX_EXTRACTION_RULES}.`,
        },
      ],
    };
  }

  for (let i = 0; i < rules.length; i++) {
    const err = validateExtractionRule(rules[i], i);
    if (err) {
      errors.push({ field: `extract[${i}]`, message: err });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract runtime variables from a normalized execution response
 * 
 * @param {object} response - Normalized response { status, headers, body, ... }
 * @param {Array<object>} rules - Array of extraction rules
 * @returns {{
 *   success: boolean,
 *   error: string|null,
 *   extractedVariables: Record<string, string>,
 *   variableNames: Array<string>
 * }}
 */
export function extractVariablesFromResponse(response, rules = []) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return {
      success: true,
      error: null,
      extractedVariables: {},
      variableNames: [],
    };
  }

  const extractedVariables = {};
  const variableNames = [];

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const validationErr = validateExtractionRule(rule, i);
    if (validationErr) {
      return {
        success: false,
        error: validationErr,
        extractedVariables: {},
        variableNames: [],
      };
    }

    const variable = rule.variable.trim();
    const source = rule.source.trim().toLowerCase();

    let extractedValue;

    switch (source) {
      case EXTRACTION_SOURCES.JSON: {
        const path = rule.path.trim();
        let targetBody = response?.body;

        // If body is a string (e.g. content-type was text/plain or unparsed), attempt to parse as JSON
        if (typeof targetBody === 'string') {
          try {
            targetBody = JSON.parse(targetBody);
          } catch {
            return {
              success: false,
              error: `JSON extraction for '${variable}' failed: Response body is not valid JSON`,
              extractedVariables: {},
              variableNames: [],
            };
          }
        }

        if (targetBody === null || targetBody === undefined || typeof targetBody !== 'object') {
          return {
            success: false,
            error: `JSON extraction for '${variable}' failed: Response body is empty or not a JSON object/array`,
            extractedVariables: {},
            variableNames: [],
          };
        }

        const pathResult = resolveJsonPath(targetBody, path);
        if (!pathResult.found) {
          return {
            success: false,
            error: `JSON extraction for '${variable}' failed: Path '${path}' not found in response body`,
            extractedVariables: {},
            variableNames: [],
          };
        }

        const rawVal = pathResult.value;
        if (rawVal === null) {
          extractedValue = 'null';
        } else if (typeof rawVal === 'object') {
          extractedValue = JSON.stringify(rawVal);
        } else {
          extractedValue = String(rawVal);
        }
        break;
      }

      case EXTRACTION_SOURCES.HEADER: {
        const headerName = (rule.header || rule.path).trim();
        const headerKey = headerName.toLowerCase();
        const headers = response?.headers || {};

        if (headers[headerKey] === undefined || headers[headerKey] === null) {
          return {
            success: false,
            error: `Header extraction for '${variable}' failed: Response header '${headerName}' not found`,
            extractedVariables: {},
            variableNames: [],
          };
        }

        extractedValue = String(headers[headerKey]);
        break;
      }

      case EXTRACTION_SOURCES.TEXT: {
        const rawBody = response?.body;
        if (typeof rawBody === 'string') {
          extractedValue = rawBody;
        } else if (rawBody === null || rawBody === undefined) {
          extractedValue = '';
        } else if (typeof rawBody === 'object') {
          extractedValue = JSON.stringify(rawBody);
        } else {
          extractedValue = String(rawBody);
        }
        break;
      }

      default:
        return {
          success: false,
          error: `Unknown extraction source '${source}' for variable '${variable}'`,
          extractedVariables: {},
          variableNames: [],
        };
    }

    extractedVariables[variable] = extractedValue;
    variableNames.push(variable);
  }

  return {
    success: true,
    error: null,
    extractedVariables,
    variableNames,
  };
}

export default {
  MAX_EXTRACTION_RULES,
  EXTRACTION_SOURCES,
  validateExtractionRule,
  validateExtractionRules,
  extractVariablesFromResponse,
};

