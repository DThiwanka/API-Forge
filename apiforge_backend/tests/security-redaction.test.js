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
  sanitizeAssertionResult,
} from '../src/utils/redaction.js';
import realtimeService from '../src/services/realtime/realtime.service.js';

describe('Security Redaction & Sensitive-Data Protection Tests (Server)', () => {
  describe('Header Redaction', () => {
    it('should identify sensitive headers case-insensitively', () => {
      assert.equal(isSensitiveHeader('Authorization'), true);
      assert.equal(isSensitiveHeader('authorization'), true);
      assert.equal(isSensitiveHeader('AUTHORIZATION'), true);
      assert.equal(isSensitiveHeader('Cookie'), true);
      assert.equal(isSensitiveHeader('Set-Cookie'), true);
      assert.equal(isSensitiveHeader('X-API-Key'), true);
      assert.equal(isSensitiveHeader('x-api-key'), true);
      assert.equal(isSensitiveHeader('ApiKey'), true);
      assert.equal(isSensitiveHeader('X-Auth-Token'), true);
      assert.equal(isSensitiveHeader('Proxy-Authorization'), true);
      assert.equal(isSensitiveHeader('my-secret-token'), true);

      // Safe headers
      assert.equal(isSensitiveHeader('Content-Type'), false);
      assert.equal(isSensitiveHeader('Accept'), false);
      assert.equal(isSensitiveHeader('User-Agent'), false);
      assert.equal(isSensitiveHeader('Host'), false);
    });

    it('should redact sensitive headers in an object map while preserving safe headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        Cookie: 'session=abc123secret; user_id=456',
        'X-Api-Key': 'key_live_987654321',
        Accept: '*/*',
      };

      const redacted = redactHeaders(headers);

      assert.equal(redacted['Content-Type'], 'application/json');
      assert.equal(redacted['Accept'], '*/*');
      assert.equal(redacted['Authorization'], REDACTED_TEXT);
      assert.equal(redacted['Cookie'], REDACTED_TEXT);
      assert.equal(redacted['X-Api-Key'], REDACTED_TEXT);
    });
  });

  describe('Query Parameter Redaction', () => {
    it('should identify sensitive query parameters', () => {
      assert.equal(isSensitiveQueryParam('api_key'), true);
      assert.equal(isSensitiveQueryParam('apiKey'), true);
      assert.equal(isSensitiveQueryParam('token'), true);
      assert.equal(isSensitiveQueryParam('access_token'), true);
      assert.equal(isSensitiveQueryParam('secret'), true);
      assert.equal(isSensitiveQueryParam('password'), true);
      assert.equal(isSensitiveQueryParam('client_secret'), true);

      assert.equal(isSensitiveQueryParam('page'), false);
      assert.equal(isSensitiveQueryParam('limit'), false);
      assert.equal(isSensitiveQueryParam('query'), false);
      assert.equal(isSensitiveQueryParam('filter'), false);
    });

    it('should redact sensitive query parameters in array format', () => {
      const queryParams = [
        { key: 'page', value: '1', enabled: true },
        { key: 'api_key', value: 'secret_key_123', enabled: true },
        { key: 'token', value: 'tok_live_xyz', enabled: false },
        { key: 'sort', value: 'desc', enabled: true },
      ];

      const redacted = redactQueryParams(queryParams);

      assert.equal(redacted[0].value, '1');
      assert.equal(redacted[1].value, REDACTED_TEXT);
      assert.equal(redacted[2].value, REDACTED_TEXT);
      assert.equal(redacted[3].value, 'desc');
    });
  });

  describe('URL Credential Redaction', () => {
    it('should redact basic auth / authority passwords', () => {
      const url = 'https://admin:mySuperSecretPassword123@api.example.com/v1/resource';
      const sanitized = redactUrl(url);

      assert.equal(sanitized, `https://admin:${REDACTED_TEXT}@api.example.com/v1/resource`);
      assert.ok(!sanitized.includes('mySuperSecretPassword123'));
    });

    it('should redact sensitive query parameters in URLs', () => {
      const url = 'https://api.example.com/data?user=john&api_key=secret999&access_token=jwt123&page=2';
      const sanitized = redactUrl(url);

      assert.ok(sanitized.includes('user=john'));
      assert.ok(sanitized.includes('page=2'));
      assert.ok(sanitized.includes(`api_key=${encodeURIComponent(REDACTED_TEXT)}`) || sanitized.includes(`api_key=${REDACTED_TEXT}`));
      assert.ok(!sanitized.includes('secret999'));
      assert.ok(!sanitized.includes('jwt123'));
    });

    it('should scrub known environment secret values present in URL path or query', () => {
      const secretValues = ['super_secret_val_xyz', 'my_api_key_456'];
      const url = 'https://api.example.com/v1/super_secret_val_xyz/get?key=my_api_key_456';
      const sanitized = redactUrl(url, secretValues);

      assert.ok(!sanitized.includes('super_secret_val_xyz'));
      assert.ok(!sanitized.includes('my_api_key_456'));
      assert.ok(sanitized.includes(REDACTED_TEXT));
    });
  });

  describe('Error Message Sanitization', () => {
    it('should strip bearer tokens and authorization headers from error messages', () => {
      const errorMsg = 'Failed to connect: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.123 was rejected';
      const sanitized = redactErrorMessage(errorMsg);

      assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.123'));
      assert.ok(sanitized.includes('Bearer [REDACTED]'));
    });

    it('should strip internal file paths from error messages', () => {
      const errorMsg = 'Failed to load configuration file C:\\Users\\Administrator\\API Forge\\server\\src\\secret.json';
      const sanitized = redactErrorMessage(errorMsg);

      assert.ok(!sanitized.includes('C:\\Users\\Administrator'));
      assert.ok(sanitized.includes('[PATH]'));
    });

    it('should collapse stack traces into generic execution error', () => {
      const errorMsg = 'Error at C:\\Users\\Administrator\\API Forge\\server\\src\\secret\\key.js:42:15';
      const sanitized = redactErrorMessage(errorMsg);

      assert.ok(!sanitized.includes('C:\\Users\\Administrator'));
      assert.equal(sanitized, 'An internal execution error occurred. Please try again.');
    });

    it('should redact known secret values embedded in error messages', () => {
      const secrets = ['sensitive-db-password-12345'];
      const errorMsg = 'Connection refused for password sensitive-db-password-12345';
      const sanitized = redactErrorMessage(errorMsg, secrets);

      assert.ok(!sanitized.includes('sensitive-db-password-12345'));
      assert.ok(sanitized.includes(REDACTED_TEXT));
    });
  });

  describe('Assertion Result Sanitization', () => {
    it('should redact sensitive header assertions', () => {
      const rawResult = {
        assertionId: 'assert-1',
        type: 'header',
        path: 'Authorization',
        passed: false,
        actualValue: 'Bearer secret123',
        message: 'Expected Authorization to equal Bearer other, received Bearer secret123',
      };

      const sanitized = sanitizeAssertionResult(rawResult);

      assert.equal(sanitized.actualValue, REDACTED_TEXT);
      assert.ok(!sanitized.message.includes('Bearer secret123'));
      assert.ok(sanitized.message.includes(REDACTED_TEXT));
    });

    it('should redact sensitive json_body path assertions', () => {
      const rawResult = {
        assertionId: 'assert-2',
        type: 'json_path',
        path: '$.auth.access_token',
        passed: true,
        actualValue: 'jwt_token_header_payload_signature',
        message: 'Assertion passed',
      };

      const sanitized = sanitizeAssertionResult(rawResult);

      assert.equal(sanitized.actualValue, REDACTED_TEXT);
    });

    it('should not redact non-sensitive assertions', () => {
      const assertion = {
        source: 'status_code',
        property: '',
        comparison: 'equals',
        targetValue: '200',
      };
      const rawResult = {
        passed: true,
        actualValue: 200,
        message: 'Expected 200, received 200',
      };

      const sanitized = sanitizeAssertionResult(rawResult, assertion);

      assert.equal(sanitized.actualValue, 200);
      assert.equal(sanitized.message, 'Expected 200, received 200');
    });
  });

  describe('Realtime Event Sanitization', () => {
    it('should strip sensitive keys and redact URLs in broadcast metadata', () => {
      const event = {
        type: 'request:executed',
        workspaceId: 'ws-123',
        actor: { id: 'u-1', displayName: 'Dev' },
        metadata: {
          requestId: 'req-456',
          url: 'https://admin:superSecret@api.internal.dev/items?api_key=xyz123',
          password: 'plain_password',
          api_key: 'top_secret',
          token: 'token_val',
          duration: 120,
        },
      };

      const sanitized = realtimeService.sanitizeEventPayload(event);

      assert.equal(sanitized.metadata.requestId, 'req-456');
      assert.equal(sanitized.metadata.duration, 120);
      assert.equal(sanitized.metadata.password, undefined);
      assert.equal(sanitized.metadata.api_key, undefined);
      assert.equal(sanitized.metadata.token, undefined);
      assert.ok(!sanitized.metadata.url.includes('superSecret'));
      assert.ok(!sanitized.metadata.url.includes('xyz123'));
      assert.ok(sanitized.metadata.url.includes(REDACTED_TEXT));
    });
  });
});
