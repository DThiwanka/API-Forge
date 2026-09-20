import dotenv from 'dotenv';

dotenv.config();

const KNOWN_DEV_SECRETS = new Set([
  'apiforge_dev_access_secret_super_secure_key_2026',
  'apiforge_dev_refresh_secret_super_secure_key_2026',
  'your_jwt_access_secret_key_here',
  'your_jwt_refresh_secret_key_here',
  'secret',
  'changeme',
]);

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/apiforge',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // JWT Configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'apiforge_dev_access_secret_super_secure_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'apiforge_dev_refresh_secret_super_secure_key_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cookie Security & Reverse Proxy
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,
  COOKIE_SECURE: process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : (process.env.NODE_ENV === 'production'),
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',
  TRUST_PROXY: process.env.TRUST_PROXY || false,

  // CORS Origins (comma-separated or single URL)
  CORS_ORIGINS: (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 30,
  RATE_LIMIT_EXEC_MAX: parseInt(process.env.RATE_LIMIT_EXEC_MAX, 10) || 120,

  // Request Execution Engine Configuration
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000,
  MAX_REQUEST_TIMEOUT_MS: parseInt(process.env.MAX_REQUEST_TIMEOUT_MS, 10) || 120000,
  MAX_RESPONSE_SIZE_BYTES: parseInt(process.env.MAX_RESPONSE_SIZE_BYTES, 10) || 10485760, // 10MB
  ALLOW_LOCAL_TARGETS: process.env.ALLOW_LOCAL_TARGETS === 'true',

  // Step 49: Browser Space Configuration
  BROWSER_MAX_SESSIONS_PER_WORKSPACE: parseInt(process.env.BROWSER_MAX_SESSIONS_PER_WORKSPACE, 10) || 5,
  BROWSER_MAX_TABS_PER_SESSION: parseInt(process.env.BROWSER_MAX_TABS_PER_SESSION, 10) || 10,
  BROWSER_NAVIGATION_TIMEOUT_MS: parseInt(process.env.BROWSER_NAVIGATION_TIMEOUT_MS, 10) || 15000,
  BROWSER_SESSION_INACTIVITY_TIMEOUT_MS: parseInt(process.env.BROWSER_SESSION_INACTIVITY_TIMEOUT_MS, 10) || 1800000, // 30 mins
  BROWSER_CLEANUP_INTERVAL_MS: parseInt(process.env.BROWSER_CLEANUP_INTERVAL_MS, 10) || 300000, // 5 mins
  BROWSER_MAX_NETWORK_EVENTS_PER_TAB: parseInt(process.env.BROWSER_MAX_NETWORK_EVENTS_PER_TAB, 10) || 500,

  // Step 53: Collaboration & Invitation Configuration
  INVITATION_EXPIRATION_HOURS: parseInt(process.env.INVITATION_EXPIRATION_HOURS, 10) || 168, // 7 days

  // Lifecycle & Logging
  SHUTDOWN_TIMEOUT_MS: parseInt(process.env.SHUTDOWN_TIMEOUT_MS, 10) || 10000,
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : (process.env.NODE_ENV === 'test' ? 'error' : 'debug')),
};

/**
 * Validates environment configuration.
 * Fails fast in production mode if required variables are missing or insecure.
 *
 * @param {object} config - Configuration object to validate (defaults to exported env)
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateEnv(config = env) {
  const errors = [];

  // Port check
  if (!config.PORT || isNaN(config.PORT) || config.PORT <= 0 || config.PORT > 65535) {
    errors.push('PORT must be a valid port number between 1 and 65535');
  }

  // Database URL check
  if (!config.DATABASE_URL || typeof config.DATABASE_URL !== 'string' || !config.DATABASE_URL.trim()) {
    errors.push('DATABASE_URL is required');
  }

  // Client URL check
  if (!config.CLIENT_URL || typeof config.CLIENT_URL !== 'string' || !config.CLIENT_URL.trim()) {
    errors.push('CLIENT_URL is required');
  }

  // Strict production assertions
  if (config.NODE_ENV === 'production') {
    if (!config.JWT_ACCESS_SECRET || KNOWN_DEV_SECRETS.has(config.JWT_ACCESS_SECRET)) {
      errors.push('JWT_ACCESS_SECRET must be configured with a secure production secret and cannot use development default');
    } else if (config.JWT_ACCESS_SECRET.length < 16) {
      errors.push('JWT_ACCESS_SECRET must be at least 16 characters long');
    }

    if (!config.JWT_REFRESH_SECRET || KNOWN_DEV_SECRETS.has(config.JWT_REFRESH_SECRET)) {
      errors.push('JWT_REFRESH_SECRET must be configured with a secure production secret and cannot use development default');
    } else if (config.JWT_REFRESH_SECRET.length < 16) {
      errors.push('JWT_REFRESH_SECRET must be at least 16 characters long');
    }

    if (config.JWT_ACCESS_SECRET && config.JWT_REFRESH_SECRET && config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
      errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET should not be identical in production');
    }

    if (config.ALLOW_LOCAL_TARGETS) {
      errors.push('ALLOW_LOCAL_TARGETS must not be enabled in production environment');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts environment is valid, throwing a formatted error if validation fails.
 *
 * @param {object} config - Configuration object
 */
export function assertValidEnv(config = env) {
  const result = validateEnv(config);
  if (!result.valid) {
    const message = [
      'Configuration validation failed:',
      ...result.errors.map((err) => `  - ${err}`),
    ].join('\n');
    throw new Error(message);
  }
}

export default env;
