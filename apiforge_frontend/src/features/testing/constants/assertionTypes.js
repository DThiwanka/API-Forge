export const ASSERTION_TYPES = {
  STATUS: 'status',
  RESPONSE_TIME: 'response_time',
  JSON_PATH: 'json_path',
  HEADER: 'header',
  BODY_CONTAINS: 'body_contains',
};

export const ASSERTION_TYPE_LABELS = {
  [ASSERTION_TYPES.STATUS]: 'Status Code',
  [ASSERTION_TYPES.RESPONSE_TIME]: 'Response Time',
  [ASSERTION_TYPES.JSON_PATH]: 'JSON Path',
  [ASSERTION_TYPES.HEADER]: 'Header',
  [ASSERTION_TYPES.BODY_CONTAINS]: 'Body Contains',
};

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

export const OPERATOR_LABELS = {
  [ASSERTION_OPERATORS.EQUALS]: 'equals',
  [ASSERTION_OPERATORS.NOT_EQUALS]: 'not equals',
  [ASSERTION_OPERATORS.CONTAINS]: 'contains',
  [ASSERTION_OPERATORS.NOT_CONTAINS]: 'does not contain',
  [ASSERTION_OPERATORS.EXISTS]: 'exists',
  [ASSERTION_OPERATORS.NOT_EXISTS]: 'does not exist',
  [ASSERTION_OPERATORS.GREATER_THAN]: '>',
  [ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL]: '>=',
  [ASSERTION_OPERATORS.LESS_THAN]: '<',
  [ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL]: '<=',
};

export const ALLOWED_OPERATORS_BY_TYPE = {
  [ASSERTION_TYPES.STATUS]: [
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
  ],
  [ASSERTION_TYPES.RESPONSE_TIME]: [
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
  ],
  [ASSERTION_TYPES.JSON_PATH]: [
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
  ],
  [ASSERTION_TYPES.HEADER]: [
    ASSERTION_OPERATORS.EXISTS,
    ASSERTION_OPERATORS.NOT_EXISTS,
    ASSERTION_OPERATORS.EQUALS,
    ASSERTION_OPERATORS.NOT_EQUALS,
    ASSERTION_OPERATORS.CONTAINS,
    ASSERTION_OPERATORS.NOT_CONTAINS,
  ],
  [ASSERTION_TYPES.BODY_CONTAINS]: [
    ASSERTION_OPERATORS.CONTAINS,
    ASSERTION_OPERATORS.NOT_CONTAINS,
    ASSERTION_OPERATORS.EXISTS,
    ASSERTION_OPERATORS.NOT_EXISTS,
  ],
};

export function requiresExpectedValue(operator) {
  return operator !== ASSERTION_OPERATORS.EXISTS && operator !== ASSERTION_OPERATORS.NOT_EXISTS;
}

export function requiresPath(type) {
  return type === ASSERTION_TYPES.JSON_PATH || type === ASSERTION_TYPES.HEADER;
}

export function isNumericValue(type, operator) {
  if (type === ASSERTION_TYPES.STATUS || type === ASSERTION_TYPES.RESPONSE_TIME) return true;
  return [
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
  ].includes(operator);
}

export function formatAssertionSummary(assertion) {
  if (!assertion) return '';
  const { type, path, operator, expectedValue } = assertion;
  const opLabel = OPERATOR_LABELS[operator] || operator;

  switch (type) {
    case ASSERTION_TYPES.STATUS:
      return `Status ${opLabel} ${expectedValue ?? ''}`;
    case ASSERTION_TYPES.RESPONSE_TIME:
      return `Response Time ${opLabel} ${expectedValue ?? ''}ms`;
    case ASSERTION_TYPES.JSON_PATH:
      return requiresExpectedValue(operator)
        ? `${path || 'path'} ${opLabel} ${expectedValue ?? ''}`
        : `${path || 'path'} ${opLabel}`;
    case ASSERTION_TYPES.HEADER:
      return requiresExpectedValue(operator)
        ? `Header '${path || 'header'}' ${opLabel} ${expectedValue ?? ''}`
        : `Header '${path || 'header'}' ${opLabel}`;
    case ASSERTION_TYPES.BODY_CONTAINS:
      return requiresExpectedValue(operator)
        ? `Body ${opLabel} '${expectedValue ?? ''}'`
        : `Body ${opLabel}`;
    default:
      return `${type} ${operator} ${expectedValue ?? ''}`.trim();
  }
}

export default {
  ASSERTION_TYPES,
  ASSERTION_TYPE_LABELS,
  ASSERTION_OPERATORS,
  OPERATOR_LABELS,
  ALLOWED_OPERATORS_BY_TYPE,
  requiresExpectedValue,
  requiresPath,
  isNumericValue,
  formatAssertionSummary,
};

