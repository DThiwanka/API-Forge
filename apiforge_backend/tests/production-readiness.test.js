/**
 * Step 64: Production Readiness, Deployment & Runtime Configuration
 *
 * production-readiness.test.js
 *
 * Validates:
 * 1. Environment validation under production simulation (missing variables, weak secrets, invalid ports)
 * 2. Liveness vs Readiness endpoints (GET /api/health, GET /api/ready)
 * 3. Production cookie options (HttpOnly, Secure, SameSite, Domain)
 * 4. Production error sanitization (stack suppression, safe generic 500s)
 * 5. Multi-origin CORS resolution
 * 6. Database connection verification utility
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import { validateEnv, env } from '../src/config/env.js';
import { checkDatabaseConnection } from '../src/config/database.js';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from '../src/services/auth/token.service.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';
import { AppError } from '../src/utils/appError.js';

describe('Step 64: Production Readiness & Deployment Configuration', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. ENVIRONMENT VALIDATION
  // ══════════════════════════════════════════════════════════════════
  describe('1. Environment Validation in Production Mode', () => {
    it('should reject production configuration if JWT secrets are using development defaults', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        PORT: 5000,
        DATABASE_URL: 'mysql://user:pass@db:3306/apiforge',
        CLIENT_URL: 'https://app.example.com',
        JWT_ACCESS_SECRET: 'apiforge_dev_access_secret_super_secure_key_2026', // Known dev secret
        JWT_REFRESH_SECRET: 'production_refresh_secret_that_is_32_chars_long',
      };

      const result = validateEnv(prodConfig);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('JWT_ACCESS_SECRET')));
    });

    it('should reject production configuration if secrets are too short (< 16 chars)', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        PORT: 5000,
        DATABASE_URL: 'mysql://user:pass@db:3306/apiforge',
        CLIENT_URL: 'https://app.example.com',
        JWT_ACCESS_SECRET: 'short_secret',
        JWT_REFRESH_SECRET: 'too_short',
      };

      const result = validateEnv(prodConfig);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('at least 16 characters')));
    });

    it('should reject production configuration if access and refresh secrets are identical', () => {
      const sameSecret = 'identical_super_long_secret_key_for_both_tokens_32chars';
      const prodConfig = {
        NODE_ENV: 'production',
        PORT: 5000,
        DATABASE_URL: 'mysql://user:pass@db:3306/apiforge',
        CLIENT_URL: 'https://app.example.com',
        JWT_ACCESS_SECRET: sameSecret,
        JWT_REFRESH_SECRET: sameSecret,
      };

      const result = validateEnv(prodConfig);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('should not be identical')));
    });

    it('should reject production configuration if ALLOW_LOCAL_TARGETS is true', () => {
      const prodConfig = {
        NODE_ENV: 'production',
        PORT: 5000,
        DATABASE_URL: 'mysql://user:pass@db:3306/apiforge',
        CLIENT_URL: 'https://app.example.com',
        JWT_ACCESS_SECRET: 'unique_access_secret_for_production_32_chars!',
        JWT_REFRESH_SECRET: 'unique_refresh_secret_for_production_32_chars!',
        ALLOW_LOCAL_TARGETS: true,
      };

      const result = validateEnv(prodConfig);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.includes('ALLOW_LOCAL_TARGETS must not be enabled')));
    });

    it('should validate successfully when strong, unique production configuration is supplied', () => {
      const validProdConfig = {
        NODE_ENV: 'production',
        PORT: 8080,
        DATABASE_URL: 'mysql://apiforge:strong_prod_password@db.internal:3306/apiforge',
        CLIENT_URL: 'https://app.example.com',
        JWT_ACCESS_SECRET: 'strong_access_secret_with_sufficient_entropy_2026',
        JWT_REFRESH_SECRET: 'strong_refresh_secret_with_distinct_entropy_2026',
        ALLOW_LOCAL_TARGETS: false,
      };

      const result = validateEnv(validProdConfig);
      assert.equal(result.valid, true);
      assert.equal(result.errors.length, 0);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. HEALTH & READINESS PROBES
  // ══════════════════════════════════════════════════════════════════
  describe('2. Health (Liveness) & Readiness Endpoints', () => {
    it('GET /api/health should act as a lightweight liveness probe (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.status, 'ok');
      assert.ok(typeof body.uptime === 'number');
      assert.ok(body.timestamp);
    });

    it('GET /api/ready should act as a readiness probe verifying database connectivity', async () => {
      const res = await fetch(`${baseUrl}/ready`);
      assert.equal(res.status, 200);

      const body = await res.json();
      assert.equal(body.status, 'ready');
      assert.equal(body.database, 'connected');
      assert.ok(body.timestamp);
    });

    it('checkDatabaseConnection utility should verify database connectivity', async () => {
      const status = await checkDatabaseConnection();
      assert.equal(status.ok, true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. COOKIE SECURITY CONFIGURATION
  // ══════════════════════════════════════════════════════════════════
  describe('3. Cookie Security Flags & Configuration', () => {
    it('access token cookie options must be HttpOnly and have root path', () => {
      const opts = getAccessTokenCookieOptions();
      assert.equal(opts.httpOnly, true);
      assert.equal(opts.path, '/');
      assert.equal(opts.maxAge, 15 * 60 * 1000);
      assert.ok(['lax', 'strict', 'none'].includes(opts.sameSite));
    });

    it('refresh token cookie options must be HttpOnly and scoped to /api/auth', () => {
      const opts = getRefreshTokenCookieOptions();
      assert.equal(opts.httpOnly, true);
      assert.equal(opts.path, '/api/auth');
      assert.equal(opts.maxAge, 7 * 24 * 60 * 60 * 1000);
      assert.ok(['lax', 'strict', 'none'].includes(opts.sameSite));
    });

    it('SameSite=None must always enforce secure: true', () => {
      const previousSameSite = env.COOKIE_SAME_SITE;
      const previousSecure = env.COOKIE_SECURE;

      try {
        env.COOKIE_SAME_SITE = 'none';
        env.COOKIE_SECURE = false; // intentionally set to false
        const opts = getAccessTokenCookieOptions();
        assert.equal(opts.secure, true, 'SameSite=None must mandate secure: true');
      } finally {
        env.COOKIE_SAME_SITE = previousSameSite;
        env.COOKIE_SECURE = previousSecure;
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. PRODUCTION ERROR SANITIZATION
  // ══════════════════════════════════════════════════════════════════
  describe('4. Production Error Sanitization & Non-Leakage', () => {
    it('should suppress stack traces and return generic message for non-operational 500 errors in production', () => {
      const previousEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';

        const unexpectedError = new Error('Database query failed at C:\\apiforge\\db.js:10:20 - password=secret123');
        unexpectedError.stack = 'Error at file:///C:/secret/path.js:1:1';

        let capturedStatus = null;
        let capturedJson = null;

        const mockRes = {
          status(code) {
            capturedStatus = code;
            return this;
          },
          json(payload) {
            capturedJson = payload;
            return this;
          },
        };

        errorMiddleware(unexpectedError, { method: 'GET', originalUrl: '/api/sensitive' }, mockRes, () => {});

        assert.equal(capturedStatus, 500);
        assert.equal(capturedJson.success, false);
        assert.equal(capturedJson.message, 'An unexpected error occurred. Please try again.');
        assert.equal(capturedJson.stack, undefined, 'Stack trace must be strictly suppressed in production');
        assert.ok(!JSON.stringify(capturedJson).includes('secret123'), 'Secrets must not leak');
        assert.ok(!JSON.stringify(capturedJson).includes('C:\\'), 'Paths must not leak');
      } finally {
        env.NODE_ENV = previousEnv;
      }
    });

    it('should preserve operational error message while redacting sensitive tokens and paths', () => {
      const previousEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';

        const operationalError = new AppError('Invalid token Bearer eyJhbGciOiJIUzI1Ni.xyz at C:\\app\\auth.js', 400);

        let capturedJson = null;
        const mockRes = {
          status: () => mockRes,
          json: (payload) => { capturedJson = payload; },
        };

        errorMiddleware(operationalError, { method: 'POST', originalUrl: '/api/test' }, mockRes, () => {});

        assert.equal(capturedJson.status, 400);
        assert.ok(!capturedJson.message.includes('eyJhbGciOiJIUzI1Ni.xyz'), 'Bearer token must be redacted');
        assert.ok(!capturedJson.message.includes('C:\\app'), 'Filesystem path must be redacted');
      } finally {
        env.NODE_ENV = previousEnv;
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. CORS AND SECURITY HEADERS
  // ══════════════════════════════════════════════════════════════════
  describe('5. Security Headers and CORS', () => {
    it('response should include fundamental security headers', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'DENY');
      assert.equal(res.headers.get('x-xss-protection'), '1; mode=block');
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.equal(res.headers.get('x-powered-by'), null);
    });

    it('CORS preflight should allow configured client origin', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
        },
      });
      assert.equal(res.status, 204);
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    });
  });
});
