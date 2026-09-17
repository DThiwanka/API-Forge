import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/apiforge',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'apiforge_dev_access_secret_super_secure_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'apiforge_dev_refresh_secret_super_secure_key_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
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
};

export default env;
