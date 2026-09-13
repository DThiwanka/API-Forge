import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  METHODS,
  getMethodConfig,
  checkMethodBodyCompatibility,
} from '../src/features/requests/utils/requestMethods.js';

import {
  detectPathParameters,
  normalizeUrl,
  mergeUrlAndQueryParams,
  syncUrlToQueryParams,
} from '../src/features/requests/utils/urlUtils.js';

import { useRequestStore } from '../src/features/requests/store/requestStore.js';

describe('Step 41: Request URL & HTTP Method UX — Unit Verification', () => {
  describe('1. Supported HTTP Methods and Configurations', () => {
    it('should support exactly the 7 standard APIForge HTTP methods', () => {
      const methodNames = METHODS.map((m) => m.method);
      assert.deepEqual(methodNames, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
    });

    it('should provide non-empty descriptions and color configurations for all methods', () => {
      for (const m of METHODS) {
        assert.ok(m.method, 'Method must have a name');
        assert.ok(m.description, `Method ${m.method} must have a description`);
        assert.ok(m.color, `Method ${m.method} must have a color`);
        assert.ok(m.badge, `Method ${m.method} must have a badge`);
      }
    });

    it('should retrieve method config case-insensitively with safe fallback to GET', () => {
      assert.equal(getMethodConfig('post').method, 'POST');
      assert.equal(getMethodConfig('DELETE').method, 'DELETE');
      assert.equal(getMethodConfig('options').method, 'OPTIONS');
      assert.equal(getMethodConfig('UNKNOWN_METHOD').method, 'GET');
      assert.equal(getMethodConfig(null).method, 'GET');
    });
  });

  describe('2. Method and Body Compatibility Checking', () => {
    it('should flag an informational notice for GET with a payload body', () => {
      const body = { mode: 'json', raw: '{"active": true}' };
      const res = checkMethodBodyCompatibility('GET', body);
      assert.equal(res.hasNotice, true);
      assert.ok(res.message.includes('GET requests typically do not include a payload body'));
    });

    it('should flag an informational notice for HEAD and OPTIONS with payload bodies', () => {
      const body = { mode: 'raw', raw: 'payload' };
      const resHead = checkMethodBodyCompatibility('HEAD', body);
      assert.equal(resHead.hasNotice, true);

      const resOptions = checkMethodBodyCompatibility('OPTIONS', body);
      assert.equal(resOptions.hasNotice, true);
    });

    it('should not flag notices for POST, PUT, PATCH, or DELETE with bodies', () => {
      const body = { mode: 'json', raw: '{"name": "test"}' };
      assert.equal(checkMethodBodyCompatibility('POST', body).hasNotice, false);
      assert.equal(checkMethodBodyCompatibility('PUT', body).hasNotice, false);
      assert.equal(checkMethodBodyCompatibility('PATCH', body).hasNotice, false);
      assert.equal(checkMethodBodyCompatibility('DELETE', body).hasNotice, false);
    });

    it('should not flag notices when body is empty or mode is none', () => {
      assert.equal(checkMethodBodyCompatibility('GET', { mode: 'none' }).hasNotice, false);
      assert.equal(checkMethodBodyCompatibility('GET', { mode: 'json', raw: '' }).hasNotice, false);
      assert.equal(checkMethodBodyCompatibility('GET', null).hasNotice, false);
    });
  });

  describe('3. Path Parameter and Variable Detection', () => {
    it('should extract APIForge template variables', () => {
      const url = 'https://{{host}}:{{port}}/api/v1/users/{{userId}}';
      const detected = detectPathParameters(url);
      assert.deepEqual(detected.variables, ['host', 'port', 'userId']);
    });

    it('should extract Express route parameters with colons (:param)', () => {
      const url = 'https://api.com/workspaces/:workspaceId/collections/:collectionId/requests/:id';
      const detected = detectPathParameters(url);
      assert.deepEqual(detected.colonParams, ['workspaceId', 'collectionId', 'id']);
    });

    it('should extract OpenAPI / URI template placeholders with single braces ({param}) without confusing {{vars}}', () => {
      const url = 'https://api.com/users/{userId}/orders/{{orderId}}';
      const detected = detectPathParameters(url);
      assert.deepEqual(detected.braceParams, ['userId']);
      assert.deepEqual(detected.variables, ['orderId']);
    });

    it('should ignore query strings and hash fragments when detecting path parameters', () => {
      const url = 'https://api.com/users/:id?filter=:ignoreQuery#section-:ignoreHash';
      const detected = detectPathParameters(url);
      assert.deepEqual(detected.colonParams, ['id']);
    });
  });

  describe('4. URL Normalization and Security Rejection', () => {
    it('should trim accidental outer whitespace while preserving query strings', () => {
      const raw = '   https://api.example.com/users?search=test&limit=10   ';
      const normalized = normalizeUrl(raw);
      assert.equal(normalized.url, 'https://api.example.com/users?search=test&limit=10');
      assert.equal(normalized.isDangerousScheme, false);
      assert.equal(normalized.scheme, 'https');
    });

    it('should reject dangerous non-HTTP schemes (javascript:, data:, file:)', () => {
      assert.equal(normalizeUrl('javascript:alert(1)').isDangerousScheme, true);
      assert.equal(normalizeUrl('data:text/html,<script>alert(1)</script>').isDangerousScheme, true);
      assert.equal(normalizeUrl('file:///etc/passwd').isDangerousScheme, true);
      assert.equal(normalizeUrl('vbscript:msgbox').isDangerousScheme, true);
    });

    it('should accept templated {{baseUrl}} URLs safely', () => {
      const res = normalizeUrl('{{baseUrl}}/api/v1/users');
      assert.equal(res.isDangerousScheme, false);
      assert.equal(res.url, '{{baseUrl}}/api/v1/users');
    });
  });

  describe('5. Query String and URL Synchronization Integrity', () => {
    it('should synchronize pasted full URLs into query parameters without loss', () => {
      const pasted = 'https://api.example.com/search?q=postman&page=2&sort=desc';
      const synced = syncUrlToQueryParams(pasted, []);
      assert.equal(synced.length, 3);
      assert.equal(synced[0].key, 'q');
      assert.equal(synced[0].value, 'postman');
      assert.equal(synced[1].key, 'page');
      assert.equal(synced[1].value, '2');
      assert.equal(synced[2].key, 'sort');
      assert.equal(synced[2].value, 'desc');
    });

    it('should preserve template variables in query parameters during merge', () => {
      const baseUrl = 'https://api.example.com/items';
      const params = [
        { key: 'userId', value: '{{userId}}', enabled: true },
        { key: 'token', value: '{{authToken}}', enabled: true },
      ];
      const merged = mergeUrlAndQueryParams(baseUrl, params);
      assert.equal(merged, 'https://api.example.com/items?userId={{userId}}&token={{authToken}}');
      // Ensure curly braces are never percent-encoded into %7B%7B
      assert.ok(!merged.includes('%7B'));
    });
  });

  describe('6. Request Store Method, URL, and Dirty State Integration', () => {
    it('should mark request dirty on method change and preserve body payload', () => {
      useRequestStore.setState({
        id: 'req-method-switch',
        method: 'POST',
        url: 'https://api.com/users',
        body: { mode: 'json', raw: '{"name": "Dulaj"}' },
        isDirty: false,
      });

      assert.equal(useRequestStore.getState().isDirty, false);

      // Change method from POST to GET
      useRequestStore.getState().setMethod('GET');

      assert.equal(useRequestStore.getState().method, 'GET');
      assert.equal(useRequestStore.getState().isDirty, true);
      // Body must be strictly preserved without deletion
      assert.equal(useRequestStore.getState().body.mode, 'json');
      assert.equal(useRequestStore.getState().body.raw, '{"name": "Dulaj"}');
    });

    it('should mark request dirty on URL change and clear', () => {
      useRequestStore.setState({
        id: 'req-url-edit',
        method: 'GET',
        url: 'https://api.com/users',
        isDirty: false,
      });

      useRequestStore.getState().setUrl('https://api.com/users/123');
      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestStore.getState().url, 'https://api.com/users/123');

      // Clear URL
      useRequestStore.getState().setUrl('');
      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestStore.getState().url, '');
    });
  });
});
