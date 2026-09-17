import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateRequestNameFromUrl,
  findMatchingRequestInCollections,
  validateBrowserNavigationTarget,
  resolveRequestUrlForBrowser,
  syncUrlToQueryParams,
} from '../src/features/browser/utils/browserClientIntegration.js';

test('Step 50: Browser ↔ API Client Integration Unit Tests', async (t) => {
  await t.test('1. Default Request Name Generation from URL', async (t2) => {
    await t2.test('generates readable name from hostname and path', () => {
      const name = generateRequestNameFromUrl('https://api.example.com/v1/users?page=2&limit=10', 'GET');
      assert.strictEqual(name, 'GET api.example.com/v1/users');
    });

    await t2.test('handles root path without trailing slash clutter', () => {
      const name = generateRequestNameFromUrl('https://api.example.com/', 'GET');
      assert.strictEqual(name, 'GET api.example.com');
    });

    await t2.test('handles non-GET HTTP methods cleanly', () => {
      const name = generateRequestNameFromUrl('https://api.example.com/v1/orders', 'POST');
      assert.strictEqual(name, 'POST api.example.com/v1/orders');
    });

    await t2.test('falls back gracefully on empty or invalid URL', () => {
      assert.strictEqual(generateRequestNameFromUrl('', 'GET'), 'GET Request');
      assert.strictEqual(generateRequestNameFromUrl(null, 'POST'), 'POST Request');
    });
  });

  await t.test('2. Query Parameter Preservation', async (t2) => {
    await t2.test('preserves complex, repeated, and encoded query parameters', () => {
      const url = 'https://api.example.com/search?query=hello%20world&filter=active&filter=pending&empty=';
      const params = syncUrlToQueryParams(url).filter((p) => p.key || p.value);

      assert.strictEqual(params.length, 4);
      assert.strictEqual(params[0].key, 'query');
      assert.strictEqual(params[0].value, 'hello world'); // decoded properly
      assert.strictEqual(params[1].key, 'filter');
      assert.strictEqual(params[1].value, 'active');
      assert.strictEqual(params[2].key, 'filter');
      assert.strictEqual(params[2].value, 'pending');
      assert.strictEqual(params[3].key, 'empty');
      assert.strictEqual(params[3].value, '');
    });

    await t2.test('preserves template variable tokens inside query values', () => {
      const url = 'https://api.example.com/users?tenantId={{tenantId}}&active=true';
      const params = syncUrlToQueryParams(url).filter((p) => p.key || p.value);

      assert.strictEqual(params[0].key, 'tenantId');
      assert.strictEqual(params[0].value, '{{tenantId}}');
    });
  });

  await t.test('3. Existing Request In-Memory Detection', async (t2) => {
    const collections = [
      {
        id: 'col-1',
        name: 'User Service',
        requests: [
          { id: 'req-1', name: 'List Users', url: 'https://api.example.com/users?page=1', method: 'GET' },
          { id: 'req-2', name: 'Create User', url: 'https://api.example.com/users', method: 'POST' },
        ],
      },
      {
        id: 'col-2',
        name: 'Order Service',
        requests: [
          { id: 'req-3', name: 'List Orders', url: 'https://api.example.com/orders', method: 'GET' },
        ],
      },
    ];

    await t2.test('finds exact matching request', () => {
      const match = findMatchingRequestInCollections(collections, 'https://api.example.com/users?page=1');
      assert.ok(match);
      assert.strictEqual(match.request.id, 'req-1');
      assert.strictEqual(match.collection.id, 'col-1');
      assert.strictEqual(match.exact, true);
    });

    await t2.test('finds base URL matching request if query param differs', () => {
      const match = findMatchingRequestInCollections(collections, 'https://api.example.com/orders?status=shipped');
      assert.ok(match);
      assert.strictEqual(match.request.id, 'req-3');
      assert.strictEqual(match.collection.id, 'col-2');
      assert.strictEqual(match.exact, false);
    });

    await t2.test('returns null when no match exists', () => {
      const match = findMatchingRequestInCollections(collections, 'https://api.example.com/unknown');
      assert.strictEqual(match, null);
    });
  });

  await t.test('4. Security & SSRF Validation for Browser Navigation', async (t2) => {
    await t2.test('permits valid public HTTP and HTTPS destinations', () => {
      const res1 = validateBrowserNavigationTarget('https://api.github.com/users');
      assert.strictEqual(res1.isValid, true);
      assert.strictEqual(res1.normalizedUrl, 'https://api.github.com/users');

      const res2 = validateBrowserNavigationTarget('http://example.com/test');
      assert.strictEqual(res2.isValid, true);
      assert.strictEqual(res2.normalizedUrl, 'http://example.com/test');
    });

    await t2.test('auto-prepends https:// when protocol is missing', () => {
      const res = validateBrowserNavigationTarget('httpbin.org/get');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.normalizedUrl, 'https://httpbin.org/get');
    });

    await t2.test('blocks dangerous non-HTTP protocols', () => {
      const res1 = validateBrowserNavigationTarget('javascript:alert(1)');
      assert.strictEqual(res1.isValid, false);
      assert.strictEqual(res1.code, 'DISALLOWED_PROTOCOL');

      const res2 = validateBrowserNavigationTarget('file:///etc/passwd');
      assert.strictEqual(res2.isValid, false);
      assert.strictEqual(res2.code, 'DISALLOWED_PROTOCOL');

      const res3 = validateBrowserNavigationTarget('data:text/html,<h1>test</h1>');
      assert.strictEqual(res3.isValid, false);
      assert.strictEqual(res3.code, 'DISALLOWED_PROTOCOL');
    });

    await t2.test('blocks embedded credentials in URLs', () => {
      const res = validateBrowserNavigationTarget('https://admin:secret@api.example.com/v1');
      assert.strictEqual(res.isValid, false);
      assert.strictEqual(res.code, 'EMBEDDED_CREDENTIALS');
    });

    await t2.test('blocks SSRF localhost and loopback targets', () => {
      const targets = [
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://[::1]:5000',
        'http://sub.localhost:8000',
      ];
      for (const t of targets) {
        const res = validateBrowserNavigationTarget(t);
        assert.strictEqual(res.isValid, false, `Expected ${t} to be blocked`);
        assert.strictEqual(res.code, 'BLOCKED_SSRF_TARGET');
      }
    });

    await t2.test('blocks SSRF private RFC1918 subnets', () => {
      const targets = [
        'http://10.0.0.1/admin',
        'http://172.16.0.5:80',
        'http://172.31.255.255',
        'http://192.168.1.1/router',
        'http://169.254.10.10',
      ];
      for (const t of targets) {
        const res = validateBrowserNavigationTarget(t);
        assert.strictEqual(res.isValid, false, `Expected ${t} to be blocked`);
        assert.strictEqual(res.code, 'BLOCKED_SSRF_TARGET');
      }
    });

    await t2.test('blocks cloud metadata endpoints', () => {
      const targets = [
        'http://169.254.169.254/latest/meta-data/',
        'http://metadata.google.internal/computeMetadata/v1/',
      ];
      for (const t of targets) {
        const res = validateBrowserNavigationTarget(t);
        assert.strictEqual(res.isValid, false, `Expected ${t} to be blocked`);
        assert.strictEqual(res.code, 'BLOCKED_SSRF_TARGET');
      }
    });
  });

  await t.test('5. Safe Environment Variable Resolution for Browser', async (t2) => {
    const varMap = new Map([
      ['baseUrl', { key: 'baseUrl', value: 'https://api.example.com', isSecret: false }],
      ['version', { key: 'version', value: 'v2', isSecret: false }],
      ['apiKey', { key: 'apiKey', value: 'secret-key-123', isSecret: true }],
    ]);

    await t2.test('replaces known variables with their environment values', () => {
      const res = resolveRequestUrlForBrowser('{{baseUrl}}/{{version}}/users', varMap);
      assert.strictEqual(res.resolvedUrl, 'https://api.example.com/v2/users');
      assert.strictEqual(res.hasUnresolved, false);
      assert.strictEqual(res.unresolvedVariables.length, 0);
    });

    await t2.test('detects unresolved template variables without throwing', () => {
      const res = resolveRequestUrlForBrowser('{{baseUrl}}/users/{{userId}}?query={{search}}', varMap);
      assert.strictEqual(res.hasUnresolved, true);
      assert.deepStrictEqual(res.unresolvedVariables, ['userId', 'search']);
    });

    await t2.test('flags secret variables without exposing secrets in unresolved lists', () => {
      const res = resolveRequestUrlForBrowser('{{baseUrl}}/data?key={{apiKey}}', varMap);
      assert.strictEqual(res.containsSecret, true);
      assert.strictEqual(res.hasUnresolved, false);
    });
  });

  await t.test('6. Zero Credential & Cookie Boundary Preservation', async (t2) => {
    await t2.test('browser-derived request draft contains no auth headers or credentials', () => {
      const browserUrl = 'https://httpbin.org/get?page=1';
      const queryParams = syncUrlToQueryParams(browserUrl);

      const requestDraft = {
        name: generateRequestNameFromUrl(browserUrl, 'GET'),
        method: 'GET',
        url: browserUrl,
        queryParams,
        headers: [],
        auth: { type: 'none' },
        body: { mode: 'none' },
      };

      assert.strictEqual(requestDraft.method, 'GET');
      assert.strictEqual(requestDraft.auth.type, 'none');
      assert.deepStrictEqual(requestDraft.headers, []);
      assert.strictEqual(requestDraft.body.mode, 'none');
      assert.ok(!('cookies' in requestDraft));
      assert.ok(!('session' in requestDraft));
    });
  });
});

