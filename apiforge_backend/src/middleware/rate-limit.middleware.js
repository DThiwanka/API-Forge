import { AppError } from '../utils/appError.js';
import { env } from '../config/env.js';

/**
 * Creates an in-memory sliding window rate limiter middleware.
 *
 * @param {object} options
 * @param {number} [options.windowMs] - Window size in ms (default from env)
 * @param {number} [options.maxRequests] - Max allowed requests per window
 * @param {string} [options.message] - Custom rejection message
 * @param {boolean} [options.skipInTests] - Whether to bypass limiter in test environment
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter({
  windowMs = env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  maxRequests = env.RATE_LIMIT_AUTH_MAX || 30,
  message = 'Too many requests. Please try again later.',
  skipInTests = true,
} = {}) {
  const store = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const valid = timestamps.filter((ts) => now - ts < windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }, Math.max(windowMs / 2, 60000));

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    if (skipInTests && env.NODE_ENV === 'test') {
      return next();
    }

    const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const timestamps = store.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - validTimestamps[0])) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(new AppError(message, 429, 'RATE_LIMIT_EXCEEDED'));
    }

    validTimestamps.push(now);
    store.set(key, validTimestamps);
    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_AUTH_MAX,
  message: 'Too many authentication attempts. Please try again later.',
  skipInTests: true,
});

export default {
  createRateLimiter,
  authRateLimiter,
};

