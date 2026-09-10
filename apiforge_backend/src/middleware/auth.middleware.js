import tokenService, { COOKIE_NAMES } from '../services/auth/token.service.js';
import userRepository from '../repositories/user.repository.js';
import { sanitizeUser } from '../services/auth/auth.service.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Authentication middleware that verifies access token from cookie or Authorization header
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies[COOKIE_NAMES.ACCESS_TOKEN]) {
    token = req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }

  // 2. Fall back to Authorization: Bearer <token>
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  // 3. Verify access token
  const decoded = tokenService.verifyAccessToken(token);

  // 4. Validate user existence and status
  const user = await userRepository.findActiveById(decoded.sub);
  if (!user) {
    throw new AppError('User not found or account is deactivated', 401);
  }

  // 5. Attach sanitized user to request
  req.user = sanitizeUser(user);
  next();
});

export default authenticate;

