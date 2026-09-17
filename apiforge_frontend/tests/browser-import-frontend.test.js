import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isSensitiveHeader,
  isBrowserInternalHeader,
  classifyHeaders,
  generateDefaultRequestName,
  sanitizeCapturedBody,
  convertCapturedEventToRequestPreview,
} from '../src/features/browser/utils/capturedRequestConverter.js';
import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';

describe('Step 52: Browser Captured Request Import Frontend Tests', () => {
  describe('1. Header Classification & Filtering', () => {
    it('identifies sensitive credential headers', () => {
      assert.equal(isSensitiveHeader('Authorization'), true);
      assert.equal(isSensitiveHeader('cookie'), true);
      assert.equal(isSensitiveHeader('Set-Cookie'), true);
      assert.equal(isSensitiveHeader('Proxy-Authorization'), true);
      assert.equal(isSensitiveHeader('x-api-key'), true);
      assert.equal(isSensitiveHeader('X-Auth-Token'), true);
      assert.equal(isSensitiveHeader('X-CSRF-Token'), true);

      assert.equal(isSensitiveHeader('Accept'), false);
      assert.equal(isSensitiveHeader('Content-Type'), false);
      assert.equal(isSensitiveHeader('User-Agent'), false);
    });

    it('identifies browser internal transport headers', () => {
      assert.equal(isBrowserInternalHeader('Host'), true);
      assert.equal(isBrowserInternalHeader('Content-Length'), true);
      assert.equal(isBrowserInternalHeader('Connection'), true);
      assert.equal(isBrowserInternalHeader('Sec-Fetch-Dest'), true);
      assert.equal(isBrowserInternalHeader('sec-ch-ua-platform'), true);

      assert.equal(isBrowserInternalHeader('Origin'), false);
      assert.equal(isBrowserInternalHeader('Referer'), false);
      assert.equal(isBrowserInternalHeader('Custom-Header'), false);
    });

    it('classifies mixed headers into safe, redacted, and excluded sets', () => {
      const input = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
        Cookie: 'session=abc',
        Host: 'api.example.com',
        'Sec-Fetch-Mode': 'cors',
        'X-App-Id': 'frontend-v2',
      };

      const { safeHeaders, redactedHeaders, excludedHeaders } = classifyHeaders(input);

      assert.equal(safeHeaders.length, 2);
      assert.deepEqual(
        safeHeaders.map((h) => h.key),
        ['Content-Type', 'X-App-Id']
      );
      assert.deepEqual(redactedHeaders, ['Authorization', 'Cookie']);
      assert.deepEqual(excludedHeaders, ['Host', 'Sec-Fetch-Mode']);
    });
  });

  describe('2. Request Name Generation', () => {
    it('generates concise default names from method and pathname', () => {
      assert.equal(generateDefaultRequestName('GET', '/api/v1/users'), 'GET /api/v1/users');
      assert.equal(generateDefaultRequestName('POST', '/login'), 'POST /login');
      assert.equal(generateDefaultRequestName('GET', '/'), 'GET Root Endpoint');
      assert.equal(generateDefaultRequestName('GET', ''), 'GET Root Endpoint');
    });
  });

  describe('3. Captured Body Sanitization', () => {
    it('formats valid JSON and retains structure', () => {
      const raw = '{"query":"test","page":1}';
      const { body, warnings } = sanitizeCapturedBody(raw, 'application/json');

      assert.equal(body.mode, 'raw');
      assert.ok(body.raw.includes('"query": "test"'));
      assert.equal(warnings.length, 0);
    });

    it('parses form-urlencoded and strips sensitive password fields', () => {
      const raw = 'email=user@test.com&password=secretpass&grant_type=password';
      const { body, warnings } = sanitizeCapturedBody(raw, 'application/x-www-form-urlencoded');

      assert.equal(body.mode, 'urlencoded');
      assert.equal(body.urlencoded.length, 2);
      assert.equal(body.urlencoded[0].key, 'email');
      assert.equal(body.urlencoded[1].key, 'grant_type');
      assert.ok(warnings.some((w) => w.includes('password')));
    });

    it('handles multipart form data without accessing file streams', () => {
      const { body, warnings } = sanitizeCapturedBody('--boundary', 'multipart/form-data; boundary=123');

      assert.equal(body.mode, 'formData');
      assert.equal(body.formData[0].value, '[browser-upload omitted]');
      assert.ok(warnings.some((w) => w.includes('Multipart form files were omitted')));
    });
  });

  describe('4. Full Event Conversion', () => {
    it('creates an APIForge request preview DTO from captured network event', () => {
      const mockEvent = {
        id: 'evt-123',
        tabId: 'tab-1',
        method: 'GET',
        url: 'https://httpbin.org/get?foo=bar&baz=123',
        pathname: '/get',
        hostname: 'httpbin.org',
        queryParams: [
          { key: 'foo', value: 'bar' },
          { key: 'baz', value: '123' },
        ],
        requestHeaders: {
          Accept: 'application/json',
          Authorization: '••••••••',
          Cookie: '••••••••',
          'Sec-Ch-Ua': 'test',
        },
        resourceType: 'fetch',
        status: 200,
        durationMs: 45,
        sizeBytes: 800,
        timestamp: '2026-09-18T00:00:00.000Z',
      };

      const preview = convertCapturedEventToRequestPreview(mockEvent);

      assert.ok(preview);
      assert.equal(preview.request.name, 'GET /get');
      assert.equal(preview.request.method, 'GET');
      assert.equal(preview.request.url, 'https://httpbin.org/get?foo=bar&baz=123');
      assert.equal(preview.request.queryParams.length, 2);
      assert.equal(preview.request.headers.length, 1);
      assert.equal(preview.request.headers[0].key, 'Accept');

      assert.deepEqual(preview.security.redactedHeaders, ['Authorization', 'Cookie']);
      assert.deepEqual(preview.security.excludedHeaders, ['Sec-Ch-Ua']);
      assert.ok(preview.security.warnings.length >= 2);
    });
  });

  describe('5. Request Tab Store Integration', () => {
    const workspaceId = 'ws-test-tab-import';

    beforeEach(() => {
      // Clear tabs for test workspace
      useRequestTabStore.setState({
        tabsByWorkspace: {},
        activeTabByWorkspace: {},
        historyByWorkspace: {},
      });
    });

    it('opens an imported request tab with isDirty: true flag requiring explicit save', () => {
      useRequestTabStore.getState().openTab({
        workspaceId,
        collectionId: 'col-1',
        requestId: 'req-imported-1',
        title: 'GET /api/v1/users',
        method: 'GET',
        url: 'https://api.example.com/api/v1/users',
        isDirty: true,
      });

      const tabs = useRequestTabStore.getState().getTabs(workspaceId);
      assert.equal(tabs.length, 1);
      assert.equal(tabs[0].requestId, 'req-imported-1');
      assert.equal(tabs[0].title, 'GET /api/v1/users');
      assert.equal(tabs[0].isDirty, true);

      const activeId = useRequestTabStore.getState().getActiveTabId(workspaceId);
      assert.equal(activeId, 'req-imported-1');
    });
  });
});

