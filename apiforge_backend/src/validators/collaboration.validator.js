import { AppError } from '../utils/appError.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate create invitation request body
 */
export function validateCreateInvitation(req, res, next) {
  const { email, role } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }

  if (role !== undefined && role !== null) {
    if (typeof role !== 'string' || !Object.values(WORKSPACE_ROLES).includes(role.toUpperCase())) {
      errors.push({
        field: 'role',
        message: `Role must be one of: ${Object.values(WORKSPACE_ROLES).join(', ')}`,
      });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.email = email.trim().toLowerCase();
  if (role) {
    req.body.role = role.toUpperCase();
  }

  next();
}

/**
 * Validate update member role request body
 */
export function validateUpdateMemberRole(req, res, next) {
  const { role } = req.body || {};
  const errors = [];

  if (!role || typeof role !== 'string' || !Object.values(WORKSPACE_ROLES).includes(role.toUpperCase())) {
    errors.push({
      field: 'role',
      message: `Role is required and must be one of: ${Object.values(WORKSPACE_ROLES).join(', ')}`,
    });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.role = role.toUpperCase();
  next();
}

export default {
  validateCreateInvitation,
  validateUpdateMemberRole,
};

