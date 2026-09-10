import authService from '../services/auth/auth.service.js';
import {
  COOKIE_NAMES,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '../services/auth/token.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/appError.js';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const result = await authService.register({ email, password, name });

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, getRefreshTokenCookieOptions());

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * Authenticate user with credentials
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * Get profile of current authenticated user
 * GET /api/auth/me
 */
export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * Refresh access and refresh tokens
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || req.body?.refreshToken;

  if (!token) {
    throw new AppError('Refresh token is required', 401);
  }

  const result = await authService.refreshTokens(token);

  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, result.accessToken, getAccessTokenCookieOptions());
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, result.refreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    success: true,
    message: 'Tokens refreshed successfully',
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

/**
 * Clear authentication session and cookies
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, {
    ...getAccessTokenCookieOptions(),
    maxAge: 0,
  });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, {
    ...getRefreshTokenCookieOptions(),
    maxAge: 0,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default {
  register,
  login,
  me,
  refresh,
  logout,
};

