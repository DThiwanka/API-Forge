import { tokenService } from '../services/auth/token.service.js';
import { AppError } from '../utils/appError.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: Missing or invalid token', 401));
  }

  const token = header.split(' ')[1];
  try {
    const decoded = tokenService.verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    next(new AppError('Unauthorized: Token expired or invalid', 401));
  }
}

export default authMiddleware;
