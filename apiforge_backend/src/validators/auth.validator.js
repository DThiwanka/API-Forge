import { AppError } from '../utils/appError.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Middleware to validate registration request body
 */
export function validateRegister(req, res, next) {
  const { email, password, name } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  } else if (password.length > 128) {
    errors.push({ field: 'password', message: 'Password must not exceed 128 characters' });
  }

  if (name !== undefined && name !== null && typeof name !== 'string') {
    errors.push({ field: 'name', message: 'Name must be a valid string' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.email = email.trim().toLowerCase();
  if (name && typeof name === 'string') {
    req.body.name = name.trim();
  }

  next();
}

/**
 * Middleware to validate login request body
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed', 400, errors));
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

export default {
  validateRegister,
  validateLogin,
};

