import { AppError } from '../utils/appError.js';

/**
 * Validate folder creation request
 */
export function validateCreateFolder(req, res, next) {
  const { name, parentId } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Folder name is required' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Folder name must not exceed 100 characters' });
  }

  if (parentId !== undefined && parentId !== null) {
    if (typeof parentId !== 'string' || parentId.trim().length === 0) {
      errors.push({ field: 'parentId', message: 'Parent ID must be a valid ID string or null' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.name = name.trim();
  req.body.parentId = parentId && typeof parentId === 'string' ? parentId.trim() : null;

  next();
}

/**
 * Validate folder update request
 */
export function validateUpdateFolder(req, res, next) {
  const { name, parentId } = req.body || {};
  const errors = [];

  if (name === undefined && parentId === undefined) {
    errors.push({
      field: 'body',
      message: 'At least one field (name or parentId) must be provided for update',
    });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Folder name cannot be empty' });
    } else if (name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Folder name must not exceed 100 characters' });
    }
  }

  if (parentId !== undefined && parentId !== null) {
    if (typeof parentId !== 'string' || parentId.trim().length === 0) {
      errors.push({ field: 'parentId', message: 'Parent ID must be a valid ID string or null' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  if (name !== undefined) {
    req.body.name = name.trim();
  }
  if (parentId !== undefined) {
    req.body.parentId = parentId && typeof parentId === 'string' ? parentId.trim() : null;
  }

  next();
}

export default {
  validateCreateFolder,
  validateUpdateFolder,
};

