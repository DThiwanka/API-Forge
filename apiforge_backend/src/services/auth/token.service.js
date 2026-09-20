import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
};

/**
 * Generate JWT Access Token (short-lived, 15m)
 * @param {object} payload - User claims { id, email }
 * @returns {string} Signed JWT
 */
export function generateAccessToken(payload) {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      type: 'access',
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    }
  );
}

/**
 * Generate JWT Refresh Token (long-lived, 7d)
 * @param {object} payload - User claims { id }
 * @returns {string} Signed JWT
 */
export function generateRefreshToken(payload) {
  return jwt.sign(
    {
      sub: payload.id,
      type: 'refresh',
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  );
}

/**
 * Verify JWT Access Token
 * @param {string} token 
 * @returns {object} Decoded payload
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Access token has expired', 401);
    }
    throw new AppError('Invalid access token', 401);
  }
}

/**
 * Verify JWT Refresh Token
 * @param {string} token 
 * @returns {object} Decoded payload
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid token type', 401);
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token has expired', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }
}

/**
 * Get cookie options for Access Token
 * @returns {import('express').CookieOptions}
 */
export function getAccessTokenCookieOptions() {
  const isSecure = env.COOKIE_SECURE ?? (env.NODE_ENV === 'production');
  const sameSite = env.COOKIE_SAME_SITE || 'lax';

  /** @type {import('express').CookieOptions} */
  const options = {
    httpOnly: true,
    secure: sameSite === 'none' ? true : isSecure,
    sameSite: sameSite,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 minutes in ms
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

/**
 * Get cookie options for Refresh Token
 * @returns {import('express').CookieOptions}
 */
export function getRefreshTokenCookieOptions() {
  const isSecure = env.COOKIE_SECURE ?? (env.NODE_ENV === 'production');
  const sameSite = env.COOKIE_SAME_SITE || 'lax';

  /** @type {import('express').CookieOptions} */
  const options = {
    httpOnly: true,
    secure: sameSite === 'none' ? true : isSecure,
    sameSite: sameSite,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  };

  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }

  return options;
}

export default {
  COOKIE_NAMES,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
};

