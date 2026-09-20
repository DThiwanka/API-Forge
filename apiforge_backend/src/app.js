import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { logger } from './utils/logger.js';

const app = express();

// Basic security headers
// Trust reverse proxy if configured (for Nginx, Caddy, Cloudflare, etc.)
if (env.TRUST_PROXY) {
  app.set('trust proxy', env.TRUST_PROXY === 'true' ? true : env.TRUST_PROXY);
}

// Production security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  res.removeHeader('X-Powered-By');
  next();
});

// CORS configuration
// CORS configuration supporting single or multiple configured origins
const allowedOrigins = Array.isArray(env.CORS_ORIGINS) && env.CORS_ORIGINS.length > 0
  ? env.CORS_ORIGINS
  : [env.CLIENT_URL || 'http://localhost:5173'];

app.use(
  cors({
    origin: env.CLIENT_URL,
    origin: (origin, callback) => {
      // Allow non-browser agents, curl, or same-origin requests (missing origin header)
      if (!origin) return callback(null, true);

      // In test or development, allow localhost loopback origins
      if (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      return callback(new Error('Blocked by CORS policy: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsing
// Body parsing with safe size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Development request logging
// Request logging (sanitized, level-aware)
if (env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
      logger.debug(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// API Routes
app.use('/api', routes);

// 404 & Centralized Error Handlers
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
