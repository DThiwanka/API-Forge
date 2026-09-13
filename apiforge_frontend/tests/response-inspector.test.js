import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJsonPath,
  resolveJsonPath,
  countJsonNodes,
} from '../src/features/response/utils/jsonPath.js';
import {
  formatTime,
  formatSize,
  isBinaryContentType,
  detectContentType,
  isLargePayload,
  parseBodyContent,
} from '../src/features/response/utils/responseFormatters.js';
import {
  getStatusCategory,
  getStatusStyles,
} from '../src/features/response/utils/responseStatusUtils.js';
import { useResponseStore } from '../src/features/response/store/responseStore.js';

describe('Step 36: Response Inspector Upgrade — Unit Verification', () => {
  describe('1. JSONPath Builder & Evaluator', () => {
    it('should generate standard root and nested dot notation paths', () => {
      assert.equal(buildJsonPath('$', 'user'), '$.user');
      assert.equal(buildJsonPath('$.user', 'id'), '$.user.id');
      assert.equal(buildJsonPath('$.user.profile', 'name'), '$.user.profile.name');
      assert.equal(buildJsonPath('$', 'token'), '$.token');
    });

    it('should generate array index paths with brackets', () => {
      assert.equal(buildJsonPath('$.items', 0, true), '$.items[0]');
      assert.equal(buildJsonPath('$.items', 5, true), '$.items[5]');
      assert.equal(buildJsonPath('$.data.users', '2', true), '$.data.users[2]');
    });

    it('should generate bracket notation for keys with special characters or spaces', () => {
      assert.equal(buildJsonPath('$.headers', 'content-type'), '$.headers["content-type"]');
      assert.equal(buildJsonPath('$', 'user name'), '$["user name"]');
      assert.equal(buildJsonPath('$.data', 'x-custom:token'), '$.data["x-custom:token"]');
    });

    it('should resolve values along a valid JSONPath', () => {
      const data = {
        user: {
          id: 42,
          profile: { name: 'Alice' },
        },
        items: [{ id: 'item-1' }, { id: 'item-2' }],
        headers: {
          'content-type': 'application/json',
        },
      };

      assert.equal(resolveJsonPath(data, '$.user.id'), 42);
      assert.equal(resolveJsonPath(data, '$.user.profile.name'), 'Alice');
      assert.equal(resolveJsonPath(data, '$.items[0].id'), 'item-1');
      assert.equal(resolveJsonPath(data, '$.items[1].id'), 'item-2');
      assert.equal(resolveJsonPath(data, '$.headers["content-type"]'), 'application/json');
    });

    it('should safely return undefined for non-existent paths', () => {
      const data = { a: 1 };
      assert.equal(resolveJsonPath(data, '$.b.c'), undefined);
      assert.equal(resolveJsonPath(null, '$.a'), undefined);
    });

    it('should accurately count AST nodes with limit enforcement', () => {
      const smallData = { a: 1, b: [1, 2, 3], c: { d: true } };
      // Root (1) + a (1) + b (1) + b elements (3) + c (1) + d (1)
      const count = countJsonNodes(smallData, 100);
      assert.ok(count > 0 && count <= 15);

      // Node limit guard
      const bigArray = Array.from({ length: 50 }, (_, i) => ({ id: i }));
      assert.ok(countJsonNodes(bigArray, 20) > 20);
    });
  });

  describe('2. Content-Type Detection & Classification', () => {
    it('should classify JSON content types correctly', () => {
      assert.equal(detectContentType('application/json'), 'json');
      assert.equal(detectContentType('application/problem+json; charset=utf-8'), 'json');
      assert.equal(detectContentType('', { test: true }), 'json');
      assert.equal(detectContentType('', '{"valid": "json"}'), 'json');
    });

    it('should classify HTML content types correctly', () => {
      assert.equal(detectContentType('text/html; charset=UTF-8'), 'html');
      assert.equal(detectContentType('application/xhtml+xml'), 'html');
      assert.equal(detectContentType('', '<!DOCTYPE html><html><body>Hello</body></html>'), 'html');
    });

    it('should classify XML content types correctly', () => {
      assert.equal(detectContentType('application/xml'), 'xml');
      assert.equal(detectContentType('text/xml'), 'xml');
      assert.equal(detectContentType('image/svg+xml'), 'xml');
      assert.equal(detectContentType('', '<?xml version="1.0"?><root></root>'), 'xml');
    });

    it('should classify binary content types correctly', () => {
      assert.equal(detectContentType('image/png'), 'binary');
      assert.equal(detectContentType('image/jpeg'), 'binary');
      assert.equal(detectContentType('application/pdf'), 'binary');
      assert.equal(detectContentType('application/octet-stream'), 'binary');
      assert.equal(detectContentType('application/zip'), 'binary');
    });

    it('should fallback to plain text for generic text content', () => {
      assert.equal(detectContentType('text/plain'), 'text');
      assert.equal(detectContentType('unknown/type', 'Hello world'), 'text');
    });
  });

  describe('3. Large Response Detection', () => {
    it('should detect payloads exceeding 500 KB limit', () => {
      const halfMb = 500 * 1024;
      assert.equal(isLargePayload(halfMb + 1, 'short'), true);
      assert.equal(isLargePayload(100, 'x'.repeat(halfMb + 1)), true);
    });

    it('should permit payloads below 500 KB limit', () => {
      assert.equal(isLargePayload(2048, 'small body'), false);
      assert.equal(isLargePayload(100000, 'x'.repeat(10000)), false);
    });
  });

  describe('4. Response Body Parser', () => {
    it('should parse object body into formatted text and parsedJson object', () => {
      const obj = { key: 'value', count: 10 };
      const res = parseBodyContent(obj);
      assert.equal(res.isJson, true);
      assert.deepEqual(res.parsedJson, obj);
      assert.ok(res.formattedText.includes('"key": "value"'));
    });

    it('should parse stringified JSON into formatted text and parsedJson', () => {
      const str = '{"user": "Alice", "active": true}';
      const res = parseBodyContent(str);
      assert.equal(res.isJson, true);
      assert.equal(res.parsedJson.user, 'Alice');
      assert.equal(res.parsedJson.active, true);
    });

    it('should treat plain strings as non-json', () => {
      const text = 'Simple error string';
      const res = parseBodyContent(text);
      assert.equal(res.isJson, false);
      assert.equal(res.parsedJson, undefined);
      assert.equal(res.formattedText, text);
    });

    it('should handle empty or null bodies cleanly', () => {
      assert.equal(parseBodyContent(null).formattedText, '');
      assert.equal(parseBodyContent(undefined).formattedText, '');
      assert.equal(parseBodyContent('').formattedText, '');
    });
  });

  describe('5. Status Code Categorization vs Execution Failures', () => {
    it('should categorize HTTP 2xx, 3xx, 4xx, and 5xx responses correctly', () => {
      assert.equal(getStatusCategory(200), 'success');
      assert.equal(getStatusCategory(204), 'success');
      assert.equal(getStatusCategory(301), 'redirect');
      assert.equal(getStatusCategory(400), 'client-error');
      assert.equal(getStatusCategory(404), 'client-error');
      assert.equal(getStatusCategory(500), 'server-error');
      assert.equal(getStatusCategory(502), 'server-error');
    });

    it('should return unknown category for execution errors with status 0 or null', () => {
      assert.equal(getStatusCategory(0), 'unknown');
      assert.equal(getStatusCategory(null), 'unknown');
      assert.equal(getStatusCategory(undefined), 'unknown');
    });
  });

  describe('6. Response Store Per-Request Tab Isolation', () => {
    beforeEach(() => {
      useResponseStore.setState({
        status: 'idle',
        response: null,
        error: null,
        activeTab: 'body',
        bodyMode: 'pretty',
        searchQuery: '',
        responsesByRequest: {},
        activeRequestId: null,
      });
    });

    it('should cache and isolate responses for different requests', () => {
      const store = useResponseStore.getState();

      const resp1 = { status: 200, statusText: 'OK', body: { user: 'Alice' } };
      const resp2 = { status: 404, statusText: 'Not Found', body: { error: 'Missing' } };

      store.setResponse('req-1', resp1);
      store.setResponse('req-2', resp2);

      const state1 = useResponseStore.getState().getResponseState('req-1');
      const state2 = useResponseStore.getState().getResponseState('req-2');

      assert.equal(state1.status, 'success');
      assert.deepEqual(state1.response, resp1);

      assert.equal(state2.status, 'success');
      assert.deepEqual(state2.response, resp2);
    });

    it('should preserve view mode and tab selections independently per request', () => {
      const store = useResponseStore.getState();

      store.setResponse('req-A', { status: 200, body: {} });
      store.setResponse('req-B', { status: 200, body: {} });

      store.setBodyMode('tree', 'req-A');
      store.setActiveTab('headers', 'req-A');

      const stateA = useResponseStore.getState().getResponseState('req-A');
      const stateB = useResponseStore.getState().getResponseState('req-B');

      assert.equal(stateA.bodyMode, 'tree');
      assert.equal(stateA.activeTab, 'headers');

      assert.equal(stateB.bodyMode, 'pretty');
      assert.equal(stateB.activeTab, 'body');
    });

    it('should switch activeRequestId and return correct scoped state', () => {
      const store = useResponseStore.getState();

      store.setResponse('req-100', { status: 201, body: { created: true } });
      store.setActiveRequestId('req-100');

      assert.equal(useResponseStore.getState().activeRequestId, 'req-100');
      assert.equal(useResponseStore.getState().status, 'success');
      assert.equal(useResponseStore.getState().response.status, 201);
    });

    it('should isolate error states from success responses across requests', () => {
      const store = useResponseStore.getState();

      const errorObj = { message: 'DNS resolution failed', status: 0 };
      store.setError('req-err', errorObj);
      store.setResponse('req-ok', { status: 200, body: {} });

      const stateErr = useResponseStore.getState().getResponseState('req-err');
      const stateOk = useResponseStore.getState().getResponseState('req-ok');

      assert.equal(stateErr.status, 'error');
      assert.equal(stateErr.error.message, 'DNS resolution failed');

      assert.equal(stateOk.status, 'success');
      assert.equal(stateOk.error, null);
    });
  });
});
