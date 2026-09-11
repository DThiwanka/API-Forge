import env from '../../config/env.js';

const MIN_TIMEOUT_MS = 100;

/**
 * Resolve request timeout bounded by minimum and maximum limits.
 * 
 * @param {number|string|null|undefined} configuredTimeout 
 * @returns {number} Timeout in milliseconds
 */
export function resolveTimeout(configuredTimeout) {
  if (configuredTimeout === undefined || configuredTimeout === null || configuredTimeout === '') {
    return env.REQUEST_TIMEOUT_MS;
  }

  const parsed = parseInt(configuredTimeout, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return env.REQUEST_TIMEOUT_MS;
  }

  // Bound between MIN_TIMEOUT_MS and MAX_REQUEST_TIMEOUT_MS
  if (parsed < MIN_TIMEOUT_MS) {
    return MIN_TIMEOUT_MS;
  }

  if (parsed > env.MAX_REQUEST_TIMEOUT_MS) {
    return env.MAX_REQUEST_TIMEOUT_MS;
  }

  return parsed;
}

export default {
  resolveTimeout,
  MIN_TIMEOUT_MS,
};

