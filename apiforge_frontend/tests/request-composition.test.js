import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  splitUrl,
  parseQueryString,
  buildQueryString,
  mergeUrlAndQueryParams,
  syncUrlToQueryParams,
  findDuplicateKeys,
  isSensitiveHeader,
  maskSensitiveHeaderValue,
} from '../src/features/requests/utils/urlUtils.js';

import { useRequestStore } from '../src/features/requests/store/requestStore.js';

describe('Step 38: Request Composition Experience — Unit Verification', () => {
  describe('1. URL Splitting and Structure Preservation', () => {
    it('should split standard URL with path, query string, and hash', () => {
      const url = 'https://api.example.com/v1/users?page=1&limit=20#top';
      const result = splitUrl(url);
      assert.equal(result.baseUrl, 'https://api.example.com/v1/users');
      assert.equal(result.queryString, 'page=1&limit=20');
      assert.equal(result.hash, 'top');
    });

    it('should handle templated URLs with {{variables}} in host, path, and query', () => {
      const url = '{{baseUrl}}/items/{{itemId}}?filter={{filterName}}&active=true';
      const result = splitUrl(url);
      assert.equal(result.baseUrl, '{{baseUrl}}/items/{{itemId}}');
      assert.equal(result.queryString, 'filter={{filterName}}&active=true');
      assert.equal(result.hash, '');
    });

    it('should handle URLs without query strings', () => {
      const url = 'https://api.example.com/v1/health';
      const result = splitUrl(url);
      assert.equal(result.baseUrl, 'https://api.example.com/v1/health');
      assert.equal(result.queryString, '');
      assert.equal(result.hash, '');
    });

    it('should handle relative URLs and bare queries', () => {
      const res1 = splitUrl('/api/search?q=test');
      assert.equal(res1.baseUrl, '/api/search');
      assert.equal(res1.queryString, 'q=test');

      const res2 = splitUrl('?debug=1');
      assert.equal(res2.baseUrl, '');
      assert.equal(res2.queryString, 'debug=1');

      const res3 = splitUrl('');
      assert.equal(res3.baseUrl, '');
      assert.equal(res3.queryString, '');
    });
  });

  describe('2. Query Parameter Parsing & Building with Variable Preservation', () => {
    it('should parse query string preserving raw {{template}} placeholders', () => {
      const qs = 'search={{searchTerm}}&limit=25&tags=api&tags=dev';
      const params = parseQueryString(qs);

      assert.equal(params.length, 4);
      assert.deepEqual(params[0], { key: 'search', value: '{{searchTerm}}', enabled: true, description: '' });
      assert.deepEqual(params[1], { key: 'limit', value: '25', enabled: true, description: '' });
      assert.deepEqual(params[2], { key: 'tags', value: 'api', enabled: true, description: '' });
      assert.deepEqual(params[3], { key: 'tags', value: 'dev', enabled: true, description: '' });
    });

    it('should safely decode encoded components while leaving {{variables}} intact', () => {
      const qs = 'name=John%20Doe&greeting=Hello+World&token={{authToken}}';
      const params = parseQueryString(qs);

      assert.equal(params[0].value, 'John Doe');
      assert.equal(params[1].value, 'Hello World');
      assert.equal(params[2].value, '{{authToken}}');
    });

    it('should build query string without percent-encoding {{curly_braces}}', () => {
      const params = [
        { key: 'filter', value: '{{filterId}}', enabled: true },
        { key: 'page', value: '{{pageNum}}', enabled: true },
        { key: 'disabled', value: 'ignored', enabled: false },
        { key: '', value: '', enabled: true }, // Empty row
      ];

      const built = buildQueryString(params);
      assert.equal(built, 'filter={{filterId}}&page={{pageNum}}');
      assert.ok(!built.includes('%7B'), 'Curly braces should not be encoded into %7B');
    });

    it('should serialize flags without values cleanly', () => {
      const params = [
        { key: 'verbose', value: '', enabled: true },
        { key: 'pretty', value: '', enabled: true },
      ];
      assert.equal(buildQueryString(params), 'verbose&pretty');
    });
  });

  describe('3. Bidirectional URL <-> Query Parameter Merging', () => {
    it('should merge query parameters into base URL', () => {
      const currentUrl = 'https://api.example.com/items?old=1#section';
      const params = [
        { key: 'new', value: '2', enabled: true },
        { key: 'token', value: '{{token}}', enabled: true },
      ];

      const merged = mergeUrlAndQueryParams(currentUrl, params);
      assert.equal(merged, 'https://api.example.com/items?new=2&token={{token}}#section');
    });

    it('should remove query string when all params are disabled or empty', () => {
      const currentUrl = 'https://api.example.com/items?foo=bar';
      const params = [
        { key: 'foo', value: 'bar', enabled: false },
      ];

      const merged = mergeUrlAndQueryParams(currentUrl, params);
      assert.equal(merged, 'https://api.example.com/items');
    });

    it('should sync URL changes to params while retaining existing descriptions and disabled rows', () => {
      const existingParams = [
        { key: 'page', value: '1', enabled: true, description: 'Page pagination index' },
        { key: 'debug', value: 'true', enabled: false, description: 'Debugging toggle' },
      ];

      const newUrl = 'https://api.example.com/users?page=3&sort=asc';
      const synced = syncUrlToQueryParams(newUrl, existingParams);

      // 'page' should have value '3', enabled: true, and preserved description
      const pageParam = synced.find((p) => p.key === 'page');
      assert.ok(pageParam);
      assert.equal(pageParam.value, '3');
      assert.equal(pageParam.description, 'Page pagination index');

      // 'sort' is newly added from URL
      const sortParam = synced.find((p) => p.key === 'sort');
      assert.ok(sortParam);
      assert.equal(sortParam.value, 'asc');

      // 'debug' was disabled in table and omitted from URL, but should be preserved
      const debugParam = synced.find((p) => p.key === 'debug');
      assert.ok(debugParam);
      assert.equal(debugParam.enabled, false);
      assert.equal(debugParam.description, 'Debugging toggle');
    });
  });

  describe('4. Duplicate Key Detection', () => {
    it('should detect duplicate keys in query params case-sensitively', () => {
      const params = [
        { key: 'id', value: '1', enabled: true },
        { key: 'id', value: '2', enabled: true },
        { key: 'ID', value: '3', enabled: true }, // Different case
        { key: 'page', value: '1', enabled: true },
      ];

      const duplicates = findDuplicateKeys(params, false);
      assert.equal(duplicates.has('id'), true);
      assert.equal(duplicates.has('ID'), false);
      assert.equal(duplicates.has('page'), false);
    });

    it('should detect duplicate keys in headers case-insensitively', () => {
      const headers = [
        { key: 'Content-Type', value: 'application/json', enabled: true },
        { key: 'content-type', value: 'text/plain', enabled: true },
        { key: 'Accept', value: '*/*', enabled: true },
      ];

      const duplicates = findDuplicateKeys(headers, true);
      assert.equal(duplicates.has('content-type'), true);
      assert.equal(duplicates.has('accept'), false);
    });

    it('should ignore disabled rows and blank keys when detecting duplicates', () => {
      const headers = [
        { key: 'Authorization', value: 'Bearer 1', enabled: true },
        { key: 'Authorization', value: 'Bearer 2', enabled: false }, // Disabled
        { key: '', value: '', enabled: true },
        { key: '', value: '', enabled: true },
      ];

      const duplicates = findDuplicateKeys(headers, true);
      assert.equal(duplicates.size, 0);
    });
  });

  describe('5. Sensitive Header Identification and Safe Masking', () => {
    it('should classify authentication, tokens, api keys, and cookies as sensitive', () => {
      assert.equal(isSensitiveHeader('Authorization'), true);
      assert.equal(isSensitiveHeader('authorization'), true);
      assert.equal(isSensitiveHeader('X-API-Key'), true);
      assert.equal(isSensitiveHeader('Cookie'), true);
      assert.equal(isSensitiveHeader('Set-Cookie'), true);
      assert.equal(isSensitiveHeader('Private-Token'), true);
      assert.equal(isSensitiveHeader('X-Auth-Token'), true);

      // Non-sensitive
      assert.equal(isSensitiveHeader('Content-Type'), false);
      assert.equal(isSensitiveHeader('Accept'), false);
      assert.equal(isSensitiveHeader('User-Agent'), false);
      assert.equal(isSensitiveHeader('Origin'), false);
    });

    it('should mask sensitive header values and preserve auth prefixes safely', () => {
      assert.equal(maskSensitiveHeaderValue('Authorization', 'Bearer secretToken12345'), 'Bearer ••••••••');
      assert.equal(maskSensitiveHeaderValue('Authorization', 'Basic dXNlcjpwYXNz'), 'Basic ••••••••');
      assert.equal(maskSensitiveHeaderValue('X-API-Key', 'ak_live_abcdef123456'), '••••••••');
      assert.equal(maskSensitiveHeaderValue('Cookie', 'sessionId=992837418274'), '••••••••');

      // Unmasked non-sensitive headers
      assert.equal(maskSensitiveHeaderValue('Content-Type', 'application/json'), 'application/json');
      assert.equal(maskSensitiveHeaderValue('Accept', '*/*'), '*/*');
    });
  });

  describe('6. Zustand Store Request Composition Actions', () => {
    beforeEach(() => {
      useRequestStore.setState({
        id: 'req-test-1',
        workspaceId: 'ws-1',
        url: 'https://api.example.com/users',
        queryParams: [{ key: '', value: '', enabled: true, description: '' }],
        headers: [{ key: '', value: '', enabled: true, description: '' }],
        auth: { type: 'none' },
        body: { mode: 'none', raw: '', urlencoded: [{ key: '', value: '', enabled: true, description: '' }] },
        isDirty: false,
      });
    });

    it('should synchronize URL when query parameters are updated', () => {
      const store = useRequestStore.getState();
      store.updateQueryParam(0, 'key', 'status');
      store.updateQueryParam(0, 'value', 'active');

      const state = useRequestStore.getState();
      assert.equal(state.url, 'https://api.example.com/users?status=active');
      assert.equal(state.isDirty, true);
    });

    it('should duplicate query parameter and reflect in URL', () => {
      const store = useRequestStore.getState();
      store.updateQueryParam(0, 'key', 'tag');
      store.updateQueryParam(0, 'value', 'frontend');
      store.duplicateQueryParam(0);

      const state = useRequestStore.getState();
      assert.equal(state.queryParams.length >= 2, true);
      assert.equal(state.queryParams[0].key, 'tag');
      assert.equal(state.queryParams[1].key, 'tag');
      assert.equal(state.url, 'https://api.example.com/users?tag=frontend&tag=frontend');
    });

    it('should support bulk enable/disable and clear for query params', () => {
      const store = useRequestStore.getState();
      store.updateQueryParam(0, 'key', 'a');
      store.updateQueryParam(0, 'value', '1');

      // Disable all
      store.enableAllQueryParams(false);
      let state = useRequestStore.getState();
      assert.equal(state.queryParams[0].enabled, false);
      assert.equal(state.url, 'https://api.example.com/users'); // Query removed from URL

      // Enable all
      store.enableAllQueryParams(true);
      state = useRequestStore.getState();
      assert.equal(state.queryParams[0].enabled, true);
      assert.equal(state.url, 'https://api.example.com/users?a=1');

      // Clear all
      store.clearAllQueryParams();
      state = useRequestStore.getState();
      assert.equal(state.queryParams.length, 1);
      assert.equal(state.queryParams[0].key, '');
      assert.equal(state.url, 'https://api.example.com/users');
    });

    it('should duplicate, bulk toggle, and clear headers', () => {
      const store = useRequestStore.getState();
      store.updateHeader(0, 'key', 'X-Custom');
      store.updateHeader(0, 'value', 'value1');
      store.duplicateHeader(0);

      let state = useRequestStore.getState();
      assert.equal(state.headers.length >= 2, true);
      assert.equal(state.headers[0].key, 'X-Custom');
      assert.equal(state.headers[1].key, 'X-Custom');

      store.enableAllHeaders(false);
      state = useRequestStore.getState();
      assert.ok(state.headers.every((h) => h.enabled === false));

      store.clearAllHeaders();
      state = useRequestStore.getState();
      assert.equal(state.headers.length, 1);
      assert.equal(state.headers[0].key, '');
    });

    it('should set header key-value without creating duplicate header when key matches case-insensitively', () => {
      const store = useRequestStore.getState();
      store.updateHeader(0, 'key', 'content-type');
      store.updateHeader(0, 'value', 'text/plain');

      // setHeaderKeyValue with uppercase Content-Type
      store.setHeaderKeyValue('Content-Type', 'application/json');

      const state = useRequestStore.getState();
      const contentHeaders = state.headers.filter((h) => (h.key || '').toLowerCase() === 'content-type');
      assert.equal(contentHeaders.length, 1);
      assert.equal(contentHeaders[0].value, 'application/json');
    });

    it('should duplicate form urlencoded fields', () => {
      const store = useRequestStore.getState();
      store.setBodyMode('x-www-form-urlencoded');
      store.updateBodyUrlEncoded(0, 'key', 'grant_type');
      store.updateBodyUrlEncoded(0, 'value', 'password');
      store.duplicateBodyUrlEncoded(0);

      const state = useRequestStore.getState();
      assert.equal(state.body.urlencoded.length >= 2, true);
      assert.equal(state.body.urlencoded[0].key, 'grant_type');
      assert.equal(state.body.urlencoded[1].key, 'grant_type');
    });
  });
});
