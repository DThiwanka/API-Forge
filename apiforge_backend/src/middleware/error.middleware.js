import { env } from '../config/env.js';
import { redactErrorMessage } from '../utils/redaction.js';
import { logger } from '../utils/logger.js';

/**
 * Centralized production-safe error middleware
 */
export function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProd = env.NODE_ENV === 'production';
  const isDev = env.NODE_ENV === 'development';

  // Log server errors internally with sanitization
  if (statusCode >= 500) {
    logger.error(`[500 Server Error] ${req.method} ${req.originalUrl}:`, err?.message || err);
  }

  let message;
  if (isProd) {
    // Non-operational errors in production get generic message
    message = err.isOperational ? redactErrorMessage(err.message) : 'An unexpected error occurred. Please try again.';
  } else {
    message = err.message || 'Internal server error';
  }

  const response = {
    success: false,
    status: statusCode,
    message,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (isDev && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export default errorMiddleware;
