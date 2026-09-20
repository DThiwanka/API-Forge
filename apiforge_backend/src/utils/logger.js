import { env } from '../config/env.js';

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const currentLevel = LOG_LEVELS[env.LOG_LEVEL?.toLowerCase()] || (
  env.NODE_ENV === 'production' ? LOG_LEVELS.info : (env.NODE_ENV === 'test' ? LOG_LEVELS.error : LOG_LEVELS.debug)
);

/**
 * Sanitizes log input to avoid printing bearer tokens, passwords, or secret keys
 *
 * @param {any} input
 * @returns {any}
 */
function sanitizeLog(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/(Bearer\s+)[A-Za-z0-9-_.]+/gi, '$1[REDACTED]')
    .replace(/(password|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?[^"',\s}]+/gi, '$1=[REDACTED]')
    .replace(/\/\/[^@]+@/, '//***:***@');
}

export const logger = {
  debug(...args) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log('[DEBUG]', ...args.map(sanitizeLog));
    }
  },

  info(...args) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log('[INFO]', ...args.map(sanitizeLog));
    }
  },

  warn(...args) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn('[WARN]', ...args.map(sanitizeLog));
    }
  },

  error(...args) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error('[ERROR]', ...args.map(sanitizeLog));
    }
  },
};

export default logger;

