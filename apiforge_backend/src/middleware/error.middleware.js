import { env } from '../config/env.js';

export function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isDev = env.NODE_ENV === 'development';

  const response = {
    success: false,
    status: statusCode,
    message: err.isOperational || isDev ? err.message : 'Internal server error',
  };

  if (isDev && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export default errorMiddleware;
