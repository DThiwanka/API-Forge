import { AppError } from '../utils/appError.js';
import { VARIABLE_KEY_REGEX } from '../services/environments/variable.service.js';

/**
 * Validate environment creation request
 */
export function validateCreateEnvironment(req, res, next) {
  const { name, description } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Environment name is required' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Environment name must not exceed 100 characters' });
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (description.length > 1000) {
      errors.push({ field: 'description', message: 'Description must not exceed 1000 characters' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.name = name.trim();
  if (description !== undefined && description !== null) {
    req.body.description = description.trim();
  }

  next();
}

/**
 * Validate environment update request
 */
export function validateUpdateEnvironment(req, res, next) {
  const { name, description } = req.body || {};
  const errors = [];

  if (name === undefined && description === undefined) {
    errors.push({
      field: 'body',
      message: 'At least one field (name or description) must be provided for update',
    });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Environment name cannot be empty' });
    } else if (name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Environment name must not exceed 100 characters' });
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (description.length > 1000) {
      errors.push({ field: 'description', message: 'Description must not exceed 1000 characters' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  if (name !== undefined) {
    req.body.name = name.trim();
  }
  if (description !== undefined) {
    req.body.description = description !== null ? description.trim() : null;
  }

  next();
}

/**
 * Validate variable creation request
 */
export function validateCreateVariable(req, res, next) {
  const { key, value, isSecret } = req.body || {};
  const errors = [];

  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    errors.push({ field: 'key', message: 'Variable key is required' });
  } else if (key.trim().length > 100) {
    errors.push({ field: 'key', message: 'Variable key must not exceed 100 characters' });
  } else if (!VARIABLE_KEY_REGEX.test(key.trim())) {
    errors.push({
      field: 'key',
      message: 'Invalid key format. Key must start with a letter or underscore and contain only alphanumeric characters and underscores',
    });
  }

  if (value === undefined || value === null) {
    errors.push({ field: 'value', message: 'Variable value is required' });
  } else if (typeof value !== 'string') {
    errors.push({ field: 'value', message: 'Variable value must be a string' });
  }

  if (isSecret !== undefined && typeof isSecret !== 'boolean') {
    errors.push({ field: 'isSecret', message: 'isSecret must be a boolean' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.key = key.trim();
  req.body.value = String(value);
  req.body.isSecret = Boolean(isSecret);

  next();
}

/**
 * Validate variable update request
 */
export function validateUpdateVariable(req, res, next) {
  const { key, value, isSecret } = req.body || {};
  const errors = [];

  if (key === undefined && value === undefined && isSecret === undefined) {
    errors.push({
      field: 'body',
      message: 'At least one field (key, value, or isSecret) must be provided for update',
    });
  }

  if (key !== undefined) {
    if (typeof key !== 'string' || key.trim().length === 0) {
      errors.push({ field: 'key', message: 'Variable key cannot be empty' });
    } else if (key.trim().length > 100) {
      errors.push({ field: 'key', message: 'Variable key must not exceed 100 characters' });
    } else if (!VARIABLE_KEY_REGEX.test(key.trim())) {
      errors.push({
        field: 'key',
        message: 'Invalid key format. Key must start with a letter or underscore and contain only alphanumeric characters and underscores',
      });
    }
  }

  if (value !== undefined && typeof value !== 'string') {
    errors.push({ field: 'value', message: 'Variable value must be a string' });
  }

  if (isSecret !== undefined && typeof isSecret !== 'boolean') {
    errors.push({ field: 'isSecret', message: 'isSecret must be a boolean' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  if (key !== undefined) req.body.key = key.trim();
  if (value !== undefined) req.body.value = String(value);
  if (isSecret !== undefined) req.body.isSecret = Boolean(isSecret);

  next();
}

export default {
  validateCreateEnvironment,
  validateUpdateEnvironment,
  validateCreateVariable,
  validateUpdateVariable,
};

