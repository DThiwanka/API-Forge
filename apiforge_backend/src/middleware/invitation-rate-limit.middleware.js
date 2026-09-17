import { AppError } from '../utils/appError.js';

// In-memory bucket store: key -> array of timestamps
const rateLimitMap = new Map();

// Periodic cleanup of stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Middleware to rate limit invitation creation
 * Defaults to max 30 invitation creations per 15 minutes per user/IP
 */
export function invitationRateLimit({
  windowMs = 15 * 60 * 1000,
  maxRequests = 30,
} = {}) {
  return (req, res, next) => {
    const key = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();

    const timestamps = rateLimitMap.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length >= maxRequests) {
      const retryAfterSeconds = Math.ceil((windowMs - (now - validTimestamps[0])) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return next(
        new AppError(
          'Too many invitations sent. Please wait before creating more invitations.',
          429,
          'RATE_LIMIT_EXCEEDED'
        )
      );
    }

    validTimestamps.push(now);
    rateLimitMap.set(key, validTimestamps);
    next();
  };
}

export default invitationRateLimit;

