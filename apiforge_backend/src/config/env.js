import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/apiforge',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

export default env;
