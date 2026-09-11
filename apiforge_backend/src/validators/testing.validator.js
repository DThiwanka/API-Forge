import {
  ASSERTION_TYPES,
  ASSERTION_OPERATORS,
  ALLOWED_OPERATORS_BY_TYPE,
} from '../services/testing/assertion-runner.service.js';
import { AppError } from '../utils/appError.js';

const VALID_TYPES = new Set(Object.values(ASSERTION_TYPES));
const VALID_OPERATORS = new Set(Object.values(ASSERTION_OPERATORS));

/**
 * Validate test creation body
 */
export function validateCreateTest(req, res, next) {
  const { name, description, enabled } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Test name is required' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Test name must not exceed 150 characters' });
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (description.trim().length > 500) {
      errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
    }
  }

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    errors.push({ field: 'enabled', message: 'Enabled must be a boolean' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.name = name.trim();
  if (description !== undefined) {
    req.body.description = description ? description.trim() : null;
  }
  if (enabled !== undefined) {
    req.body.enabled = Boolean(enabled);
  }

  next();
}

/**
 * Validate test update body
 */
export function validateUpdateTest(req, res, next) {
  const { name, description, enabled } = req.body || {};
  const errors = [];

  const fieldsProvided = [name, description, enabled].some((f) => f !== undefined);
  if (!fieldsProvided) {
    return next(
      new AppError('Validation failed', 400, [
        { field: 'body', message: 'At least one field (name, description, enabled) must be provided' },
      ])
    );
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Test name cannot be empty' });
    } else if (name.trim().length > 150) {
      errors.push({ field: 'name', message: 'Test name must not exceed 150 characters' });
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (description.trim().length > 500) {
      errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
    }
  }

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    errors.push({ field: 'enabled', message: 'Enabled must be a boolean' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  if (name !== undefined) req.body.name = name.trim();
  if (description !== undefined) {
    req.body.description = description ? description.trim() : null;
  }
  if (enabled !== undefined) req.body.enabled = Boolean(enabled);

  next();
}

/**
 * Validate assertion creation body
 */
export function validateCreateAssertion(req, res, next) {
  const { type, operator, path, expectedValue, position } = req.body || {};
  const errors = [];

  if (!type || typeof type !== 'string' || !VALID_TYPES.has(type)) {
    errors.push({
      field: 'type',
      message: `Invalid assertion type. Allowed types: ${Array.from(VALID_TYPES).join(', ')}`,
    });
  }

  if (!operator || typeof operator !== 'string' || !VALID_OPERATORS.has(operator)) {
    errors.push({
      field: 'operator',
      message: `Invalid operator. Allowed operators: ${Array.from(VALID_OPERATORS).join(', ')}`,
    });
  }

  // Cross check type and operator if both are valid
  if (type && VALID_TYPES.has(type) && operator && VALID_OPERATORS.has(operator)) {
    const allowed = ALLOWED_OPERATORS_BY_TYPE[type];
    if (!allowed || !allowed.has(operator)) {
      errors.push({
        field: 'operator',
        message: `Operator '${operator}' is not valid for type '${type}'. Allowed: ${allowed ? Array.from(allowed).join(', ') : ''}`,
      });
    }
  }

  // Path requirements
  if (type === ASSERTION_TYPES.JSON_PATH || type === ASSERTION_TYPES.HEADER) {
    if (!path || typeof path !== 'string' || path.trim().length === 0) {
      errors.push({ field: 'path', message: `Path is required for assertion type '${type}'` });
    }
  }

  // Expected value requirement
  const requiresExpectedValue =
    operator !== ASSERTION_OPERATORS.EXISTS && operator !== ASSERTION_OPERATORS.NOT_EXISTS;

  if (requiresExpectedValue && (expectedValue === undefined || expectedValue === null)) {
    errors.push({
      field: 'expectedValue',
      message: `Expected value is required for operator '${operator}'`,
    });
  }

  // Numeric checks
  const numericOps = [
    ASSERTION_OPERATORS.GREATER_THAN,
    ASSERTION_OPERATORS.GREATER_THAN_OR_EQUAL,
    ASSERTION_OPERATORS.LESS_THAN,
    ASSERTION_OPERATORS.LESS_THAN_OR_EQUAL,
  ];
  if (operator && numericOps.includes(operator)) {
    if (expectedValue === null || expectedValue === undefined || isNaN(Number(expectedValue))) {
      errors.push({
        field: 'expectedValue',
        message: `Expected value must be a valid number for operator '${operator}'`,
      });
    }
  }

  // Position check
  if (position !== undefined && position !== null) {
    if (!Number.isInteger(Number(position)) || Number(position) < 0) {
      errors.push({ field: 'position', message: 'Position must be a non-negative integer' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.type = type;
  req.body.operator = operator;
  req.body.path = path ? path.trim() : null;
  if (position !== undefined && position !== null) {
    req.body.position = Number(position);
  }

  next();
}

/**
 * Validate assertion update body
 */
export function validateUpdateAssertion(req, res, next) {
  const { type, operator, position } = req.body || {};
  const errors = [];

  const fieldsProvided = ['type', 'operator', 'path', 'expectedValue', 'position'].some(
    (f) => req.body?.[f] !== undefined
  );
  if (!fieldsProvided) {
    return next(
      new AppError('Validation failed', 400, [
        {
          field: 'body',
          message: 'At least one field (type, operator, path, expectedValue, position) must be provided',
        },
      ])
    );
  }

  if (type !== undefined && (!VALID_TYPES.has(type) || typeof type !== 'string')) {
    errors.push({
      field: 'type',
      message: `Invalid assertion type. Allowed types: ${Array.from(VALID_TYPES).join(', ')}`,
    });
  }

  if (operator !== undefined && (!VALID_OPERATORS.has(operator) || typeof operator !== 'string')) {
    errors.push({
      field: 'operator',
      message: `Invalid operator. Allowed operators: ${Array.from(VALID_OPERATORS).join(', ')}`,
    });
  }

  if (position !== undefined && position !== null) {
    if (!Number.isInteger(Number(position)) || Number(position) < 0) {
      errors.push({ field: 'position', message: 'Position must be a non-negative integer' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  next();
}

export default {
  validateCreateTest,
  validateUpdateTest,
  validateCreateAssertion,
  validateUpdateAssertion,
};

