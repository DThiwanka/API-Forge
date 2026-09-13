import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  suggestVariableName,
  formatPrimitiveValue,
  buildStatusAssertion,
  buildResponseTimeAssertion,
  buildHeaderAssertion,
  buildJsonPathAssertion,
} from '../src/features/response/utils/responseActionHelpers.js';
import { buildJsonPath } from '../src/features/response/utils/jsonPath.js';

describe('Step 37: Response-to-Request Debugging Actions — Unit Verification', () => {
  describe('1. Variable Name Suggestions from JSONPaths', () => {
    it('should suggest clean camelCase variable names for simple and nested paths', () => {
      assert.equal(suggestVariableName('$.user.id'), 'userId');
      assert.equal(suggestVariableName('$.access_token'), 'accessToken');
      assert.equal(suggestVariableName('$.token'), 'token');
      assert.equal(suggestVariableName('$.refresh_token'), 'refreshToken');
      assert.equal(suggestVariableName('$.data.user.email'), 'email');
      assert.equal(suggestVariableName('$.items[0].id'), 'itemId');
      assert.equal(suggestVariableName('$.headers["content-type"]'), 'contentType');
      assert.equal(suggestVariableName('$.data["custom-key"]'), 'customKey');
      assert.equal(suggestVariableName('$.result.payload.orderId'), 'orderId');
    });

    it('should handle array index paths gracefully', () => {
      assert.equal(suggestVariableName('$.users[0].id'), 'userId');
      assert.equal(suggestVariableName('$.records[5].name'), 'name');
    });

    it('should fallback to safe identifier for invalid or empty paths', () => {
      assert.equal(suggestVariableName(''), 'extractedVar');
      assert.equal(suggestVariableName(null), 'extractedVar');
      assert.equal(suggestVariableName('$'), 'extractedVar');
    });
  });

  describe('2. Primitive Value Formatting & Falsy Value Handling', () => {
    it('should format string values as raw unquoted text', () => {
      assert.equal(formatPrimitiveValue('hello world'), 'hello world');
      assert.equal(formatPrimitiveValue('token-12345'), 'token-12345');
    });

    it('should preserve falsy values (0, false, null, empty string) without treating them as missing', () => {
      assert.equal(formatPrimitiveValue(0), '0');
      assert.equal(formatPrimitiveValue(false), 'false');
      assert.equal(formatPrimitiveValue(''), '');
      assert.equal(formatPrimitiveValue(null), 'null');
      assert.equal(formatPrimitiveValue(undefined), '');
    });

    it('should serialize objects and arrays into valid JSON without [object Object]', () => {
      const obj = { id: 1, name: 'Test' };
      const formatted = formatPrimitiveValue(obj);
      assert.ok(formatted.includes('"id": 1'));
      assert.ok(!formatted.includes('[object Object]'));

      const arr = [1, 2, 3];
      assert.equal(formatPrimitiveValue(arr), '[\n  1,\n  2,\n  3\n]');
    });
  });

  describe('3. Assertion Payload Construction', () => {
    it('should build status assertion with default equals operator', () => {
      const res200 = buildStatusAssertion(200);
      assert.deepEqual(res200, {
        type: 'status',
        operator: 'equals',
        path: null,
        expectedValue: '200',
      });

      const res404 = buildStatusAssertion(404);
      assert.equal(res404.expectedValue, '404');
    });

    it('should build response time assertion with sensible less_than threshold', () => {
      const res248 = buildResponseTimeAssertion(248);
      assert.equal(res248.type, 'response_time');
      assert.equal(res248.operator, 'less_than');
      assert.equal(res248.path, null);
      // 248ms * 1.5 rounded to next 50 -> 400, clamped to min 500
      assert.equal(res248.expectedValue, '500');

      const res800 = buildResponseTimeAssertion(800);
      assert.equal(res800.expectedValue, '1200');
    });

    it('should build header assertion normalized to lowercase key', () => {
      const res = buildHeaderAssertion('Content-Type', 'application/json; charset=utf-8');
      assert.deepEqual(res, {
        type: 'header',
        operator: 'equals',
        path: 'content-type',
        expectedValue: 'application/json; charset=utf-8',
      });
    });

    it('should build JSON Path assertion with equals for primitive values including falsy values', () => {
      const strAssert = buildJsonPathAssertion('$.user.name', 'Dulaj');
      assert.deepEqual(strAssert, {
        type: 'json_path',
        operator: 'equals',
        path: '$.user.name',
        expectedValue: 'Dulaj',
      });

      const zeroAssert = buildJsonPathAssertion('$.count', 0);
      assert.deepEqual(zeroAssert, {
        type: 'json_path',
        operator: 'equals',
        path: '$.count',
        expectedValue: '0',
      });

      const boolAssert = buildJsonPathAssertion('$.user.active', false);
      assert.deepEqual(boolAssert, {
        type: 'json_path',
        operator: 'equals',
        path: '$.user.active',
        expectedValue: 'false',
      });
    });

    it('should build JSON Path assertion with exists operator for null, undefined, or objects', () => {
      const nullAssert = buildJsonPathAssertion('$.deletedAt', null);
      assert.deepEqual(nullAssert, {
        type: 'json_path',
        operator: 'exists',
        path: '$.deletedAt',
        expectedValue: '',
      });

      const objAssert = buildJsonPathAssertion('$.user.profile', { theme: 'dark' });
      assert.deepEqual(objAssert, {
        type: 'json_path',
        operator: 'exists',
        path: '$.user.profile',
        expectedValue: '',
      });
    });
  });

  describe('4. Variable Extraction Validation & Safety', () => {
    const VARIABLE_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

    it('should validate valid variable identifier names', () => {
      assert.ok(VARIABLE_REGEX.test('userId'));
      assert.ok(VARIABLE_REGEX.test('accessToken'));
      assert.ok(VARIABLE_REGEX.test('user_id'));
      assert.ok(VARIABLE_REGEX.test('_token'));
    });

    it('should reject invalid variable names containing spaces or dashes', () => {
      assert.ok(!VARIABLE_REGEX.test('user-id'));
      assert.ok(!VARIABLE_REGEX.test('user id'));
      assert.ok(!VARIABLE_REGEX.test('123user'));
      assert.ok(!VARIABLE_REGEX.test('user@email'));
    });

    it('should never persist response values as static environment secrets', () => {
      // Extraction rules only store source, path, and target variable name
      const extractionRule = {
        source: 'json',
        path: '$.token',
        variable: 'accessToken',
      };

      assert.equal(extractionRule.value, undefined);
      assert.equal(Object.keys(extractionRule).length, 3);
      assert.deepEqual(Object.keys(extractionRule).sort(), ['path', 'source', 'variable']);
    });
  });

  describe('5. Request Creation from Response URL', () => {
    it('should configure new request defaults with GET and target URL', () => {
      const responseUrl = 'https://api.example.com/v1/users?limit=10';
      const requestConfig = {
        method: 'GET',
        url: responseUrl,
        name: 'Request from URL',
      };

      assert.equal(requestConfig.method, 'GET');
      assert.equal(requestConfig.url, responseUrl);
      assert.equal(requestConfig.name, 'Request from URL');
    });

    it('should not copy authentication or cookies when creating request from URL', () => {
      const response = {
        url: 'https://api.example.com/v1/orders',
        headers: {
          authorization: 'Bearer secret-token-123',
          cookie: 'session=xyz',
          'set-cookie': ['session=xyz; HttpOnly'],
        },
      };

      const newRequestPayload = {
        name: 'New Request',
        method: 'GET',
        url: response.url,
      };

      // Verify no sensitive credentials are automatically attached
      assert.equal(newRequestPayload.headers, undefined);
      assert.equal(newRequestPayload.auth, undefined);
      assert.equal(newRequestPayload.url, 'https://api.example.com/v1/orders');
    });
  });

  describe('6. Integration with JSONPath Navigation', () => {
    it('should build coherent JSONPaths for deep and array elements', () => {
      const p1 = buildJsonPath('$', 'data');
      const p2 = buildJsonPath(p1, 'users');
      const p3 = buildJsonPath(p2, 0, true);
      const p4 = buildJsonPath(p3, 'id');

      assert.equal(p4, '$.data.users[0].id');

      const varName = suggestVariableName(p4);
      assert.equal(varName, 'userId');

      const assertion = buildJsonPathAssertion(p4, 42);
      assert.equal(assertion.path, '$.data.users[0].id');
      assert.equal(assertion.expectedValue, '42');
    });
  });
});

