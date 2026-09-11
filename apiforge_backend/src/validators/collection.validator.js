import { AppError } from '../utils/appError.js';

/**
 * Validate collection creation request
 */
export function validateCreateCollection(req, res, next) {
  const { name, description } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Collection name is required' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Collection name must not exceed 100 characters' });
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
  if (description && typeof description === 'string') {
    req.body.description = description.trim();
  }

  next();
}

/**
 * Validate collection update request
 */
export function validateUpdateCollection(req, res, next) {
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
      errors.push({ field: 'name', message: 'Collection name cannot be empty' });
    } else if (name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Collection name must not exceed 100 characters' });
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
    req.body.description = typeof description === 'string' ? description.trim() : null;
  }

  next();
}

export default {
  validateCreateCollection,
  validateUpdateCollection,
};

