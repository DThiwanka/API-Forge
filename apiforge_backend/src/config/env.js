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
};

export default env;
