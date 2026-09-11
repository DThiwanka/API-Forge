import { AppError } from '../utils/appError.js';

export function notFoundMiddleware(req, res, next) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404));
}

export default notFoundMiddleware;
