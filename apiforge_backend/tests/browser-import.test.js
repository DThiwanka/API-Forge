import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import browserImportService, {
  isSensitiveHeader,
  isBrowserInternalHeader,
  sanitizeHeaders,
  sanitizeBody,
  generateImportPreview,
} from '../src/services/browser/browser-import.service.js';
import networkService from '../src/services/browser/network.service.js';
import browserSessionService from '../src/services/browser/browser-session.service.js';

describe('Step 52: Browser Captured Request Import Backend Tests', () => {
  const workspaceId = 'ws-import-test';
  const userId = 'user-import-test';

  beforeEach(async () => {
    await browserSessionService.clearAllSessions();
    networkService.resetNetworkBuffers();
  });

  afterEach(async () => {
    await browserSessionService.clearAllSessions();
    networkService.resetNetworkBuffers();
  });

  describe('1. Header Classification & Sanitization', () => {
    it('accurately classifies sensitive headers', () => {
      const sensitiveKeys = [
        'authorization',
        'Authorization',
        'cookie',
        'Cookie',
        'set-cookie',
        'Proxy-Authorization',
        'x-api-key',
        'X-API-KEY',
        'ApiKey',
        'token',
        'my-secret-token',
        'x-auth-token',
        'x-csrf-token',
      ];
      for (const k of sensitiveKeys) {
        assert.equal(isSensitiveHeader(k), true, `Expected "${k}" to be sensitive`);
      }

      const harmlessKeys = ['Accept', 'Content-Type', 'User-Agent', 'Origin', 'Referer', 'X-Request-Id'];
      for (const k of harmlessKeys) {
        assert.equal(isSensitiveHeader(k), false, `Expected "${k}" to be non-sensitive`);
      }
    });

    it('accurately identifies browser-internal transport headers', () => {
      const internalKeys = [
        'Host',
        'host',
        'Content-Length',
        'Connection',
        'Keep-Alive',
        'Sec-Ch-Ua',
        'sec-fetch-dest',
        'sec-fetch-mode',
        'sec-fetch-site',
        'sec-fetch-user',
        'Upgrade',
      ];
      for (const k of internalKeys) {
        assert.equal(isBrowserInternalHeader(k), true, `Expected "${k}" to be internal`);
      }

      assert.equal(isBrowserInternalHeader('Content-Type'), false);
      assert.equal(isBrowserInternalHeader('X-App-Version'), false);
    });

    it('sanitizes headers into safe, redacted, and excluded sets', () => {
      const inputHeaders = {
        'Content-Type': 'application/json',
        Accept: 'text/html,application/json',
        Authorization: 'Bearer secret-12345',
        Cookie: 'session=abc; uid=42',
        'Sec-Fetch-Mode': 'cors',
        Host: 'api.example.com',
        'Content-Length': '42',
        'X-Client-Version': '1.2.3',
      };

      const { safeHeaders, redactedHeaders, excludedHeaders } = sanitizeHeaders(inputHeaders);

      // Safe headers
      assert.equal(safeHeaders.length, 3);
      assert.deepEqual(
        safeHeaders.map((h) => h.key),
        ['Content-Type', 'Accept', 'X-Client-Version']
      );

      // Redacted headers
      assert.equal(redactedHeaders.length, 2);
      assert.ok(redactedHeaders.includes('Authorization'));
      assert.ok(redactedHeaders.includes('Cookie'));

      // Excluded transport headers
      assert.equal(excludedHeaders.length, 3);
      assert.ok(excludedHeaders.includes('Sec-Fetch-Mode'));
      assert.ok(excludedHeaders.includes('Host'));
      assert.ok(excludedHeaders.includes('Content-Length'));
    });
  });

  describe('2. Body Sanitization & Type Conversion', () => {
    it('parses and formats application/json bodies cleanly', () => {
      const rawJson = '{"name":"Alice","active":true}';
      const { body, warnings } = sanitizeBody(rawJson, 'application/json');

      assert.equal(body.mode, 'raw');
      assert.ok(body.raw.includes('"name": "Alice"'));
      assert.ok(body.raw.includes('"active": true'));
      assert.equal(warnings.length, 0);
    });

    it('parses form-urlencoded bodies and strips password fields', () => {
      const rawForm = 'username=dulaj&password=supersecret&remember=true';
      const { body, warnings } = sanitizeBody(rawForm, 'application/x-www-form-urlencoded');

      assert.equal(body.mode, 'urlencoded');
      assert.equal(body.urlencoded.length, 2);
      assert.equal(body.urlencoded[0].key, 'username');
      assert.equal(body.urlencoded[0].value, 'dulaj');
      assert.equal(body.urlencoded[1].key, 'remember');
      assert.equal(body.urlencoded[1].value, 'true');

      // Password must be removed with warning
      assert.ok(warnings.some((w) => w.includes('password')));
    });

    it('handles multipart/form-data safely without copying files', () => {
      const { body, warnings } = sanitizeBody('--boundary...', 'multipart/form-data; boundary=xyz');

      assert.equal(body.mode, 'formData');
      assert.equal(body.formData.length, 1);
      assert.equal(body.formData[0].value, '[browser-upload omitted]');
      assert.ok(warnings.some((w) => w.includes('Multipart form files were omitted')));
    });

    it('returns empty body for empty or whitespace content', () => {
      assert.equal(sanitizeBody('').body.mode, 'none');
      assert.equal(sanitizeBody(null).body.mode, 'none');
      assert.equal(sanitizeBody('   ').body.mode, 'none');
    });
  });

  describe('3. Full Import Preview Generation', () => {
    it('converts a captured GET request with query params and security warnings', () => {
      const mockEvent = {
        id: 'evt-get-1',
        tabId: 'tab-1',
        method: 'GET',
        url: 'https://api.example.com/v1/users?page=2&limit=50',
        pathname: '/v1/users',
        hostname: 'api.example.com',
        queryParams: [
          { key: 'page', value: '2' },
          { key: 'limit', value: '50' },
        ],
        requestHeaders: {
          Accept: 'application/json',
          Authorization: '••••••••',
          Cookie: '••••••••',
          'User-Agent': 'APIForge-Browser',
          'Sec-Fetch-Site': 'same-origin',
        },
        resourceType: 'fetch',
        status: 200,
        durationMs: 84,
        sizeBytes: 1200,
        timestamp: '2026-09-18T00:00:00.000Z',
      };

      const preview = generateImportPreview(mockEvent);

      assert.ok(preview);
      assert.equal(preview.request.name, 'GET /v1/users');
      assert.equal(preview.request.method, 'GET');
      assert.equal(preview.request.url, 'https://api.example.com/v1/users?page=2&limit=50');
      assert.equal(preview.request.pathname, '/v1/users');
      assert.equal(preview.request.hostname, 'api.example.com');
      assert.equal(preview.request.queryParams.length, 2);
      assert.equal(preview.request.queryParams[0].key, 'page');
      assert.equal(preview.request.queryParams[0].value, '2');

      // Headers
      assert.equal(preview.request.headers.length, 2); // Accept and User-Agent
      assert.ok(preview.security.redactedHeaders.includes('Authorization'));
      assert.ok(preview.security.redactedHeaders.includes('Cookie'));
      assert.ok(preview.security.excludedHeaders.includes('Sec-Fetch-Site'));

      // Warnings
      assert.ok(preview.security.warnings.length >= 2);
      assert.ok(preview.security.warnings.some((w) => w.includes('Security-sensitive credentials')));
    });

    it('converts a captured POST request with JSON body', () => {
      const mockEvent = {
        id: 'evt-post-1',
        tabId: 'tab-2',
        method: 'POST',
        url: 'https://api.example.com/login',
        pathname: '/login',
        hostname: 'api.example.com',
        queryParams: [],
        requestHeaders: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'Sec-Ch-Ua': 'test',
        },
        postData: '{"username":"dulaj","role":"admin"}',
        resourceType: 'fetch',
      };

      const preview = generateImportPreview(mockEvent);

      assert.equal(preview.request.method, 'POST');
      assert.equal(preview.request.body.mode, 'raw');
      assert.ok(preview.request.body.raw.includes('"username": "dulaj"'));
      assert.equal(preview.request.headers.length, 2); // Content-Type and Origin
      assert.ok(preview.security.excludedHeaders.includes('Sec-Ch-Ua'));
    });

    it('rejects invalid or empty event object', () => {
      assert.throws(
        () => generateImportPreview(null),
        (err) => err.statusCode === 400 && err.errors?.code === 'INVALID_NETWORK_EVENT'
      );
    });
  });

  describe('4. Event Lookup & Session Integration', () => {
    it('retrieves event by ID from network service and generates preview', async () => {
      const session = await browserSessionService.createSession(workspaceId, userId);
      const tab = session.tabs[0];

      const recorded = networkService.recordRequest(tab.id, {
        url: () => 'https://api.example.com/items?cat=electronics',
        method: () => 'GET',
        headers: () => ({
          Accept: 'application/json',
          Authorization: 'Bearer secret-abc',
        }),
        resourceType: () => 'fetch',
      });

      const preview = browserImportService.getCapturedRequestImportPreview(recorded.id);

      assert.ok(preview);
      assert.equal(preview.request.url, 'https://api.example.com/items?cat=electronics');
      assert.equal(preview.request.queryParams[0].key, 'cat');
      assert.equal(preview.request.queryParams[0].value, 'electronics');
      assert.ok(preview.security.redactedHeaders.includes('Authorization'));
    });

    it('throws 404 for non-existent event ID', () => {
      assert.throws(
        () => browserImportService.getCapturedRequestImportPreview('non-existent-id'),
        (err) => err.statusCode === 404 && err.errors?.code === 'CAPTURED_REQUEST_NOT_FOUND'
      );
    });
  });
});

