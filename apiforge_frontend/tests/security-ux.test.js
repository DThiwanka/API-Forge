import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  REDACTED_TEXT,
  MASKED_TEXT,
  isSensitiveHeader,
  isSensitiveQueryParam,
  isSensitiveKey,
  redactHeaders,
  redactQueryParams,
  redactUrl,
  redactErrorMessage,
} from '../src/utils/redaction.js';
import { sanitizeErrorMessage } from '../src/utils/errorHandler.js';

describe('Step 60: Security UX & Sensitive-Data Protection (Frontend)', () => {
  describe('1. Centralized Header & Query Parameter Redaction', () => {
    it('should correctly flag sensitive header names regardless of casing', () => {
      assert.equal(isSensitiveHeader('Authorization'), true);
      assert.equal(isSensitiveHeader('authorization'), true);
      assert.equal(isSensitiveHeader('cookie'), true);
      assert.equal(isSensitiveHeader('Set-Cookie'), true);
      assert.equal(isSensitiveHeader('X-API-KEY'), true);
      assert.equal(isSensitiveHeader('x-auth-token'), true);
      assert.equal(isSensitiveHeader('my-secret-key'), true);

      // Safe headers
      assert.equal(isSensitiveHeader('Content-Type'), false);
      assert.equal(isSensitiveHeader('Accept'), false);
      assert.equal(isSensitiveHeader('Origin'), false);
    });

    it('should correctly identify sensitive query parameters', () => {
      assert.equal(isSensitiveQueryParam('token'), true);
      assert.equal(isSensitiveQueryParam('api_key'), true);
      assert.equal(isSensitiveQueryParam('secret'), true);
      assert.equal(isSensitiveQueryParam('password'), true);
      assert.equal(isSensitiveQueryParam('page'), false);
      assert.equal(isSensitiveQueryParam('limit'), false);
    });

    it('should redact sensitive headers in dictionary while preserving safe headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer eyJhbGciOiJIUzI1Ni...',
        Cookie: 'session=xyz987',
        'X-API-KEY': 'live_key_abcdef',
        Accept: 'text/html',
      };

      const redacted = redactHeaders(headers);

      assert.equal(redacted['Content-Type'], 'application/json');
      assert.equal(redacted['Accept'], 'text/html');
      assert.equal(redacted['Authorization'], REDACTED_TEXT);
      assert.equal(redacted['Cookie'], REDACTED_TEXT);
      assert.equal(redacted['X-API-KEY'], REDACTED_TEXT);
    });

    it('should redact sensitive query parameters in array format', () => {
      const params = [
        { key: 'page', value: '1' },
        { key: 'token', value: 'super-secret-token' },
        { key: 'api_key', value: 'key-123' },
        { key: 'limit', value: '25' },
      ];

      const redacted = redactQueryParams(params);

      assert.equal(redacted[0].value, '1');
      assert.equal(redacted[1].value, REDACTED_TEXT);
      assert.equal(redacted[2].value, REDACTED_TEXT);
      assert.equal(redacted[3].value, '25');
    });
  });

  describe('2. URL Credential Sanitization', () => {
    it('should redact basic auth / authority passwords', () => {
      const rawUrl = 'https://admin:superSecretPass123@api.internal.com/v1/resource';
      const sanitized = redactUrl(rawUrl);

      assert.equal(sanitized, `https://admin:${REDACTED_TEXT}@api.internal.com/v1/resource`);
      assert.ok(!sanitized.includes('superSecretPass123'));
    });

    it('should redact sensitive query parameters in URL', () => {
      const rawUrl = 'https://api.example.com/search?q=test&api_key=secret-999&auth=tok_abc';
      const sanitized = redactUrl(rawUrl);

      assert.ok(sanitized.includes('q=test'));
      assert.ok(!sanitized.includes('secret-999'));
      assert.ok(!sanitized.includes('tok_abc'));
      assert.ok(sanitized.includes(REDACTED_TEXT));
    });

    it('should mask known environment secret values in URL', () => {
      const rawUrl = 'https://api.example.com/v1/my-top-secret-token/items';
      const secrets = ['my-top-secret-token'];
      const sanitized = redactUrl(rawUrl, secrets);

      assert.ok(!sanitized.includes('my-top-secret-token'));
      assert.ok(sanitized.includes(REDACTED_TEXT));
    });
  });

  describe('3. Error Message & Feedback Sanitization', () => {
    it('should strip Bearer tokens and authorization headers from error messages', () => {
      const errorMsg = 'HTTP 401: Unauthorized for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.123.456';
      const sanitized = sanitizeErrorMessage(errorMsg);

      assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.123.456'));
      assert.ok(sanitized.includes('Bearer [REDACTED]'));
    });

    it('should redact filesystem paths in benign error messages', () => {
      const errorMsg = 'Failed to read file from C:\\Users\\Administrator\\API Forge\\config.json';
      const sanitized = sanitizeErrorMessage(errorMsg);

      assert.ok(!sanitized.includes('C:\\Users\\Administrator'));
      assert.ok(sanitized.includes('[PATH]'));
    });

    it('should collapse stack traces and SQL queries into safe generic error', () => {
      const traceMsg = 'Error at C:\\Users\\Admin\\project\\index.js:42:10\n    at Module._compile (node:internal/modules/cjs/loader:1256:14)';
      assert.equal(sanitizeErrorMessage(traceMsg), 'An internal error occurred. Please try again.');

      const sqlMsg = 'Database failure: syntax error at or near SELECT * FROM users WHERE id = 1';
      assert.equal(sanitizeErrorMessage(sqlMsg), 'An internal error occurred. Please try again.');
    });

    it('should redact known secret values embedded in error messages', () => {
      const secrets = ['super-secret-password-12345'];
      const errorMsg = 'Connection to gateway failed using key super-secret-password-12345';
      const sanitized = sanitizeErrorMessage(errorMsg, secrets);

      assert.ok(!sanitized.includes('super-secret-password-12345'));
      assert.ok(sanitized.includes(REDACTED_TEXT));
    });

    it('should sanitize errors directly with redactErrorMessage', () => {
      const sanitized = redactErrorMessage('Error: token=12345 in operation');
      assert.ok(!sanitized.includes('12345'));
      assert.ok(sanitized.includes(REDACTED_TEXT));
    });
  });

  describe('4. Command Center & Search Index Protection', () => {
    it('should sanitize URLs before building search keywords and descriptions', () => {
      const dirtyUrl = 'https://admin:myPassword@api.service.com/items?token=secret123';
      const safeUrl = redactUrl(dirtyUrl);

      const command = {
        title: 'Get Sensitive Items',
        method: 'GET',
        path: safeUrl,
        description: `in Production Collection • ${safeUrl}`,
        keywords: ['Get Sensitive Items', 'GET', safeUrl, 'Production Collection'],
      };

      // Ensure no raw passwords or query tokens leak into keywords, description, or path
      assert.ok(!command.path.includes('myPassword'));
      assert.ok(!command.path.includes('secret123'));
      assert.ok(!command.description.includes('myPassword'));
      assert.ok(!command.description.includes('secret123'));
      assert.ok(command.keywords.every((kw) => !kw.includes('myPassword') && !kw.includes('secret123')));
    });
  });

  describe('5. Storage & Sensitive Boundary Verification', () => {
    it('should ensure sensitive keywords and secret values are cleanly masked', () => {
      assert.equal(MASKED_TEXT, '••••••••');
      assert.equal(isSensitiveKey('authorization'), true);
      assert.equal(isSensitiveKey('x-api-key'), true);
      assert.equal(isSensitiveKey('password'), true);
      assert.equal(isSensitiveKey('client_secret'), true);
      assert.equal(isSensitiveKey('refreshToken'), true);

      assert.equal(isSensitiveKey('username'), false);
      assert.equal(isSensitiveKey('workspaceId'), false);
      assert.equal(isSensitiveKey('collectionName'), false);
    });
  });
});
