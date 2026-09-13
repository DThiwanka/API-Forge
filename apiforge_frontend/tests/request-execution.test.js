import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateRequestBeforeSend,
  classifyClientExecutionError,
  sanitizeErrorMessage,
} from '../src/features/requests/utils/executionUtils.js';

import { useResponseStore } from '../src/features/response/store/responseStore.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';

describe('Step 40: Request Execution UX & Send Experience — Unit Verification', () => {
  describe('1. Pre-Flight Request Validation', () => {
    it('should reject empty or whitespace-only URL', () => {
      const res1 = validateRequestBeforeSend({ url: '' });
      assert.equal(res1.isValid, false);
      assert.ok(res1.error.includes('enter a request URL'));

      const res2 = validateRequestBeforeSend({ url: '   \t  ' });
      assert.equal(res2.isValid, false);
      assert.ok(res2.error.includes('enter a request URL'));
    });

    it('should warn when URL lacks a protocol and does not start with variable', () => {
      const res = validateRequestBeforeSend({ url: 'api.example.com/users' });
      assert.equal(res.isValid, true);
      assert.ok(res.warnings.some((w) => w.includes('protocol')));
    });

    it('should accept valid http://, https://, or {{var}} URLs without protocol warning', () => {
      const resHttp = validateRequestBeforeSend({ url: 'http://api.example.com/users' });
      assert.equal(resHttp.isValid, true);
      assert.equal(resHttp.warnings.length, 0);

      const resHttps = validateRequestBeforeSend({ url: 'https://api.example.com/users' });
      assert.equal(resHttps.isValid, true);
      assert.equal(resHttps.warnings.length, 0);

      const resVar = validateRequestBeforeSend(
        { url: '{{baseUrl}}/users' },
        { knownVariableKeys: ['baseUrl'] }
      );
      assert.equal(resVar.isValid, true);
      assert.equal(resVar.warnings.length, 0);
    });

    it('should reject invalid JSON body when body mode is json', () => {
      const res = validateRequestBeforeSend({
        url: 'https://httpbin.org/post',
        body: {
          mode: 'json',
          raw: '{\n  "broken": \n}',
        },
      });
      assert.equal(res.isValid, false);
      assert.ok(res.error.includes('Invalid JSON'));
    });

    it('should accept valid or templated JSON body in json mode', () => {
      const res = validateRequestBeforeSend({
        url: 'https://httpbin.org/post',
        body: {
          mode: 'json',
          raw: '{\n  "id": {{userId}},\n  "name": "APIForge"\n}',
        },
      });
      assert.equal(res.isValid, true);
      assert.equal(res.error, null);
    });

    it('should detect undefined variables and report them in warnings without blocking send', () => {
      const res = validateRequestBeforeSend(
        { url: 'https://api.com/items/{{itemId}}/detail/{{unknownVar}}' },
        { knownVariableKeys: ['itemId'] }
      );
      assert.equal(res.isValid, true);
      assert.equal(res.undefinedVariables.length, 1);
      assert.equal(res.undefinedVariables[0], 'unknownVar');
      assert.ok(res.warnings.some((w) => w.includes('unknownVar')));
    });
  });

  describe('2. Error Classification & Sanitization', () => {
    it('should classify timeout errors accurately with status 504 and actionable tips', () => {
      const err = {
        message: 'Request timed out after 30000ms',
        response: { status: 504 },
      };
      const classified = classifyClientExecutionError(err);
      assert.equal(classified.type, 'TIMEOUT');
      assert.equal(classified.title, 'Request Timed Out');
      assert.equal(classified.status, 504);
      assert.ok(classified.suggestions.length >= 2);
    });

    it('should classify SSRF / security blocks accurately', () => {
      const err = {
        response: {
          status: 403,
          data: { message: 'Destination private IP address is rejected by SSRF protection policy' },
        },
      };
      const classified = classifyClientExecutionError(err);
      assert.equal(classified.type, 'SECURITY');
      assert.equal(classified.status, 403);
      assert.ok(classified.title.includes('Security Policy'));
      assert.ok(classified.suggestions.some((s) => s.includes('SSRF')));
    });

    it('should classify connection refused and DNS errors as NETWORK', () => {
      const err = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8080',
      };
      const classified = classifyClientExecutionError(err);
      assert.equal(classified.type, 'NETWORK');
      assert.equal(classified.status, 502);
      assert.ok(classified.suggestions.some((s) => s.includes('connection')));
    });

    it('should classify 400 unresolved variable errors as VALIDATION', () => {
      const err = {
        response: {
          status: 400,
          data: { message: "Variable 'apiKey' cannot be resolved" },
        },
      };
      const classified = classifyClientExecutionError(err);
      assert.equal(classified.type, 'VALIDATION');
      assert.equal(classified.status, 400);
      assert.ok(classified.suggestions.some((s) => s.includes('active environment')));
    });

    it('should sanitize stack traces and internal file paths', () => {
      const rawErrorWithStack =
        'Error: Connect failed\n    at Object.send (C:\\Users\\Dulaj\\Desktop\\API Forge\\backend\\server.js:42:15)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)';
      const sanitized = sanitizeErrorMessage(rawErrorWithStack);
      assert.ok(!sanitized.includes('at Object'));
      assert.ok(!sanitized.includes('C:\\Users'));
      assert.ok(!sanitized.includes('server.js:42'));
    });
  });

  describe('3. Request / Response Tab Isolation', () => {
    beforeEach(() => {
      useResponseStore.getState().clearAllResponses();
    });

    it('should maintain independent response states for distinct request IDs', () => {
      const reqId1 = 'req-abc-1';
      const reqId2 = 'req-xyz-2';

      // 1. Set response for reqId1
      useResponseStore.getState().setResponse(reqId1, {
        status: 200,
        statusText: 'OK',
        timeMs: 120,
        body: '{"message": "Response 1"}',
      });

      // 2. Set response for reqId2
      useResponseStore.getState().setResponse(reqId2, {
        status: 404,
        statusText: 'Not Found',
        timeMs: 65,
        body: '{"message": "Response 2"}',
      });

      // 3. Inspect isolated states
      const state1 = useResponseStore.getState().getResponseState(reqId1);
      const state2 = useResponseStore.getState().getResponseState(reqId2);

      assert.equal(state1.status, 'success');
      assert.equal(state1.response.status, 200);

      assert.equal(state2.status, 'success');
      assert.equal(state2.response.status, 404);
    });

    it('should preserve previous response data when re-executing (loading status)', () => {
      const reqId = 'req-reuse-1';

      // First run succeeds
      useResponseStore.getState().setResponse(reqId, {
        status: 200,
        statusText: 'OK',
        timeMs: 90,
        body: '{"cached": true}',
      });

      // Second run starts executing (setLoading)
      useResponseStore.getState().setLoading(reqId);

      const state = useResponseStore.getState().getResponseState(reqId);
      assert.equal(state.status, 'loading');
      // Crucial: previous response payload must NOT be erased during loading to avoid UI flicker
      assert.ok(state.response !== null);
      assert.equal(state.response.status, 200);
    });

    it('should isolate errors to the specific active request without leaking', () => {
      const reqA = 'req-success-tab';
      const reqB = 'req-failure-tab';

      useResponseStore.getState().setResponse(reqA, {
        status: 200,
        statusText: 'OK',
        timeMs: 150,
      });

      useResponseStore.getState().setError(reqB, {
        type: 'TIMEOUT',
        title: 'Request Timed Out',
        message: 'Timeout after 30000ms',
        status: 504,
      });

      const stateA = useResponseStore.getState().getResponseState(reqA);
      const stateB = useResponseStore.getState().getResponseState(reqB);

      assert.equal(stateA.status, 'success');
      assert.equal(stateA.error, null);

      assert.equal(stateB.status, 'error');
      assert.equal(stateB.error.type, 'TIMEOUT');
    });
  });

  describe('4. Draft State & Request Store Integrity', () => {
    it('should track dirty state when editing fields', () => {
      useRequestStore.setState({
        id: 'req-test-dirty',
        url: 'https://api.example.com',
        isDirty: false,
      });

      assert.equal(useRequestStore.getState().isDirty, false);

      useRequestStore.getState().setUrl('https://api.example.com/v2');
      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestStore.getState().url, 'https://api.example.com/v2');
    });

    it('should produce clean payload ready for backend execution', () => {
      useRequestStore.setState({
        id: 'req-clean-payload',
        name: 'My Endpoint',
        method: 'POST',
        url: 'https://api.example.com/items',
        queryParams: [
          { key: 'active', value: 'true', enabled: true },
          { key: 'filter', value: 'temp', enabled: false },
        ],
        headers: [
          { key: 'Content-Type', value: 'application/json', enabled: true },
        ],
        body: {
          mode: 'json',
          raw: '{"ok": true}',
          urlencoded: [],
          formData: [],
        },
      });

      const payload = useRequestStore.getState().getCleanPayload();
      assert.equal(payload.method, 'POST');
      assert.equal(payload.url, 'https://api.example.com/items');
      assert.equal(payload.queryParams.length, 2);
      assert.equal(payload.queryParams[0].key, 'active');
      assert.equal(payload.queryParams[0].enabled, true);
      assert.equal(payload.queryParams[1].enabled, false);
      assert.equal(payload.body.mode, 'json');
    });
  });
});
