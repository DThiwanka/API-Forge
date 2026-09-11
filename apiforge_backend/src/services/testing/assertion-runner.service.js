import { resolveJsonPath } from './json-path.service.js';

/**
 * Supported assertion types
 */
export const ASSERTION_TYPES = {
  STATUS: 'status',
  RESPONSE_TIME: 'response_time',
  JSON_PATH: 'json_path',
  HEADER: 'header',
  BODY_CONTAINS: 'body_contains',
};

/**
 * Supported assertion operators
 */
export const ASSERTION_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  EXISTS: 'exists',
  NOT_EXISTS: 'not_exists',
  GREATER_THAN: 'greater_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  LESS_THAN: 'less_than',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
};

/**
 * Operator compatibility matrix per assertion type
 */
export const ALLOWED_OPERATORS_BY_TYPE = {
  [ASSERTION_TYPES.STATUS]: new Set([
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
  ]),
  [ASSERTION_TYPES.RESPONSE_TIME]: new Set([
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
  ]),
  [ASSERTION_TYPES.JSON_PATH]: new Set([
    ASSERTION_OPERATORS.EXISTS,
    ASSERTION_OPERATORS.NOT_EXISTS,
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
    ASSERTION_OPERATORS.CONTAINS,
    ASSERTION_OPERATORS.NOT_CONTAINS,
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
  ]),
  [ASSERTION_TYPES.HEADER]: new Set([
    ASSERTION_OPERATORS.EXISTS,
    ASSERTION_OPERATORS.NOT_EXISTS,
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
    ASSERTION_OPERATORS.CONTAINS,
    ASSERTION_OPERATORS.NOT_CONTAINS,
  ]),
  [ASSERTION_TYPES.BODY_CONTAINS]: new Set([
    ASSERTION_OPERATORS.CONTAINS,
    ASSERTION_OPERATORS.NOT_CONTAINS,
    ASSERTION_OPERATORS.EXISTS,
    ASSERTION_OPERATORS.NOT_EXISTS,
  ]),
};

/**
 * Compare equality supporting numbers, booleans, and strings
 */
function compareEquals(actual, expected) {
  if (actual === null || actual === undefined) {
    return expected === null || expected === undefined || expected === 'null';
  }

  // Boolean comparison
  if (typeof actual === 'boolean') {
    return actual === (expected === true || expected === 'true');
  }

  // Number comparison
  if (!isNaN(Number(actual)) && !isNaN(Number(expected)) && typeof actual !== 'object') {
    return Number(actual) === Number(expected);
  }

  // String comparison
  return String(actual) === String(expected);
}

/**
 * Compare contains supporting strings and arrays
 */
function compareContains(actual, expected) {
  if (actual === null || actual === undefined) return false;

  if (Array.isArray(actual)) {
    return actual.some(
      (item) =>
        String(item) === String(expected) ||
        (typeof item === 'string' && item.includes(String(expected)))
    );
  }

  return String(actual).includes(String(expected));
}

/**
 * Evaluate a single assertion definition against normalized HTTP response
 * 
 * @param {object} response - Normalized execution response
 * @param {object} assertion - ApiAssertion entity
 * @returns {object} Assertion evaluation result
 */
export function evaluateAssertion(response, assertion) {
  const { id, type, path, operator, expectedValue } = assertion;

  let actualValue;
  let found = true;

  // 1. Extract target actualValue based on assertion type
  switch (type) {
    case ASSERTION_TYPES.STATUS:
      actualValue = response?.status;
      break;

    case ASSERTION_TYPES.RESPONSE_TIME:
      actualValue = response?.timeMs;
      break;

    case ASSERTION_TYPES.HEADER: {
      const headerKey = path ? path.trim().toLowerCase() : '';
      const headers = response?.headers || {};
      actualValue = headers[headerKey];
      found = actualValue !== undefined;
      break;
    }

    case ASSERTION_TYPES.BODY_CONTAINS: {
      if (typeof response?.body === 'string') {
        actualValue = response.body;
      } else if (response?.body !== null && response?.body !== undefined) {
        actualValue = JSON.stringify(response.body);
      } else {
        actualValue = '';
      }
      found = Boolean(actualValue && actualValue.length > 0);
      break;
    }

    case ASSERTION_TYPES.JSON_PATH: {
      const pathResult = resolveJsonPath(response?.body, path);
      found = pathResult.found;
      actualValue = pathResult.value;
      break;
    }

    default:
      return {
        assertionId: id,
        type,
        path,
        operator,
        passed: false,
        actualValue: undefined,
        expectedValue,
        message: `Unsupported assertion type: '${type}'`,
      };
  }

  // 2. Evaluate operator against actual value
  let passed = false;
  let message = null;

  switch (operator) {
    case ASSERTION_OPERATORS.EXISTS:
      passed = found && actualValue !== undefined && actualValue !== null;
      if (!passed) {
        message = path
          ? `Expected '${path}' to exist, but it was not found`
          : 'Expected value to exist';
      }
      break;

    case ASSERTION_OPERATORS.NOT_EXISTS:
      passed = !found || actualValue === undefined || actualValue === null;
      if (!passed) {
        message = path
          ? `Expected '${path}' not to exist, but found value: ${JSON.stringify(actualValue)}`
          : 'Expected value not to exist';
      }
      break;

    case ASSERTION_OPERATORS.EQUALS:
      passed = found && compareEquals(actualValue, expectedValue);
      if (!passed) {
        message = `Expected ${type}${path ? ` (${path})` : ''} to equal ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`;
      }
      break;

    case ASSERTION_OPERATORS.NOT_EQUALS:
      passed = found && !compareEquals(actualValue, expectedValue);
      if (!passed) {
        message = `Expected ${type}${path ? ` (${path})` : ''} not to equal ${JSON.stringify(expectedValue)}`;
      }
      break;

    case ASSERTION_OPERATORS.CONTAINS:
      passed = found && compareContains(actualValue, expectedValue);
      if (!passed) {
        message = `Expected ${type}${path ? ` (${path})` : ''} to contain ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`;
      }
      break;

    case ASSERTION_OPERATORS.NOT_CONTAINS:
      passed = found && !compareContains(actualValue, expectedValue);
      if (!passed) {
        message = `Expected ${type}${path ? ` (${path})` : ''} not to contain ${JSON.stringify(expectedValue)}`;
      }
      break;

    case ASSERTION_OPERATORS.GREATER_THAN: {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      passed = found && !isNaN(numActual) && !isNaN(numExpected) && numActual > numExpected;
      if (!passed) {
        message = `Expected ${type} to be greater than ${expectedValue}, but got ${actualValue}`;
      }
      break;
    }

    case ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL: {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      passed = found && !isNaN(numActual) && !isNaN(numExpected) && numActual >= numExpected;
      if (!passed) {
        message = `Expected ${type} to be greater than or equal to ${expectedValue}, but got ${actualValue}`;
      }
      break;
    }

    case ASSERTION_OPERATORS.LESS_THAN: {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      passed = found && !isNaN(numActual) && !isNaN(numExpected) && numActual < numExpected;
      if (!passed) {
        message = `Expected ${type} to be less than ${expectedValue}, but got ${actualValue}`;
      }
      break;
    }

    case ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL: {
      const numActual = Number(actualValue);
      const numExpected = Number(expectedValue);
      passed = found && !isNaN(numActual) && !isNaN(numExpected) && numActual <= numExpected;
      if (!passed) {
        message = `Expected ${type} to be less than or equal to ${expectedValue}, but got ${actualValue}`;
      }
      break;
    }

    default:
      passed = false;
      message = `Unsupported operator: '${operator}'`;
  }

  return {
    assertionId: id,
    type,
    path: path || null,
    operator,
    passed,
    actualValue: actualValue !== undefined ? actualValue : null,
    expectedValue: expectedValue !== undefined ? expectedValue : null,
    message,
  };
}

/**
 * Execute an array of assertions against a normalized response
 * 
 * @param {object} response - Normalized HTTP response
 * @param {Array<object>} assertions - List of ApiAssertion entities
 * @returns {{
 *   passed: boolean,
 *   total: number,
 *   passedCount: number,
 *   failedCount: number,
 *   results: Array<object>
 * }}
 */
export function runAssertions(response, assertions = []) {
  if (!Array.isArray(assertions) || assertions.length === 0) {
    return {
      passed: true,
      total: 0,
      passedCount: 0,
      failedCount: 0,
      results: [],
    };
  }

  const results = assertions.map((assertion) =>
    evaluateAssertion(response, assertion)
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    passed: failedCount === 0,
    total: results.length,
    passedCount,
    failedCount,
    results,
  };
}

export default {
  ASSERTION_TYPES,
  ASSERTION_OPERATORS,
  ALLOWED_OPERATORS_BY_TYPE,
  evaluateAssertion,
  runAssertions,
};

