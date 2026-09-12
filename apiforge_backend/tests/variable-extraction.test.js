import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { resolveJsonPath } from '../src/services/testing/json-path.service.js';
import {
  extractVariablesFromResponse,
  validateExtractionRules,
  validateExtractionRule,
} from '../src/services/runner/variable-extraction.service.js';

describe('Variable Extraction & Request Chaining Tests', () => {
  describe('Unit: resolveJsonPath with JSONPath Root Syntax', () => {
    const payload = {
      token: 'jwt.sample.token',
      user: {
        id: 42,
        name: 'Dulaj',
        isAdmin: false,
        extra: null,
      },
      items: [
        { id: 'item-1', value: 100 },
        { id: 'item-2', value: 200 },
      ],
      emptyStr: '',
    };

    it('should resolve paths starting with $. and standard dot paths', () => {
      assert.deepEqual(resolveJsonPath(payload, '$.token'), { found: true, value: 'jwt.sample.token' });
      assert.deepEqual(resolveJsonPath(payload, 'token'), { found: true, value: 'jwt.sample.token' });
      assert.deepEqual(resolveJsonPath(payload, '$.user.id'), { found: true, value: 42 });
      assert.deepEqual(resolveJsonPath(payload, 'user.id'), { found: true, value: 42 });
    });

    it('should resolve array indexes with brackets and dot notation', () => {
      assert.deepEqual(resolveJsonPath(payload, '$.items[0].id'), { found: true, value: 'item-1' });
      assert.deepEqual(resolveJsonPath(payload, 'items[1].value'), { found: true, value: 200 });
      assert.deepEqual(resolveJsonPath(payload, '$.items.length'), { found: true, value: 2 });
    });

    it('should correctly distinguish falsy values from missing paths', () => {
      // boolean false
      assert.deepEqual(resolveJsonPath(payload, '$.user.isAdmin'), { found: true, value: false });
      // null value
      assert.deepEqual(resolveJsonPath(payload, '$.user.extra'), { found: true, value: null });
      // empty string
      assert.deepEqual(resolveJsonPath(payload, '$.emptyStr'), { found: true, value: '' });
      // missing property
      assert.deepEqual(resolveJsonPath(payload, '$.user.missing'), { found: false, value: undefined });
      // array out of bounds
      assert.deepEqual(resolveJsonPath(payload, '$.items[99].id'), { found: false, value: undefined });
    });

    it('should safely reject prototype pollution keys', () => {
      assert.deepEqual(resolveJsonPath(payload, '__proto__'), { found: false, value: undefined });
      assert.deepEqual(resolveJsonPath(payload, '$.__proto__.polluted'), { found: false, value: undefined });
      assert.deepEqual(resolveJsonPath(payload, 'constructor'), { found: false, value: undefined });
      assert.deepEqual(resolveJsonPath(payload, 'prototype'), { found: false, value: undefined });
    });

    it('should resolve root $ to the target object itself', () => {
      assert.deepEqual(resolveJsonPath(payload, '$'), { found: true, value: payload });
    });
  });

  describe('Unit: extractVariablesFromResponse & Validation', () => {
    it('should validate variable names, sources, and paths', () => {
      assert.equal(validateExtractionRule({ variable: 'validVar', source: 'json', path: '$.id' }), null);
      assert.equal(validateExtractionRule({ variable: '_valid_123', source: 'header', header: 'X-Id' }), null);
      assert.equal(validateExtractionRule({ variable: 'rawBody', source: 'text' }), null);

      // Invalid variable name
      assert.match(validateExtractionRule({ variable: '123invalid', source: 'json', path: '$.id' }), /invalid/i);
      assert.match(validateExtractionRule({ variable: 'bad-dash', source: 'json', path: '$.id' }), /invalid/i);

      // Invalid source
      assert.match(validateExtractionRule({ variable: 'v', source: 'xml', path: '$.id' }), /invalid source/i);

      // Missing path for json
      assert.match(validateExtractionRule({ variable: 'v', source: 'json' }), /missing 'path'/i);

      // Missing header for header
      assert.match(validateExtractionRule({ variable: 'v', source: 'header' }), /missing header name/i);
    });

    it('should validate extraction rules array limit', () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => ({
        variable: `var_${i}`,
        source: 'text',
      }));
      const res = validateExtractionRules(tooMany);
      assert.equal(res.valid, false);
      assert.match(res.errors[0].message, /too many/i);
    });

    it('should extract json, header, and text values from response', () => {
      const response = {
        status: 200,
        headers: {
          'x-request-id': 'req-xyz-789',
          'content-type': 'application/json',
        },
        body: {
          token: 'token-abc',
          user: { id: 101, active: false, meta: null },
        },
      };

      const rules = [
        { variable: 'authToken', source: 'json', path: '$.token' },
        { variable: 'userId', source: 'json', path: '$.user.id' },
        { variable: 'isActive', source: 'json', path: '$.user.active' },
        { variable: 'userMeta', source: 'json', path: '$.user.meta' },
        { variable: 'reqId', source: 'header', header: 'X-Request-Id' },
        { variable: 'fullBody', source: 'text' },
      ];

      const res = extractVariablesFromResponse(response, rules);
      assert.equal(res.success, true);
      assert.equal(res.error, null);
      assert.deepEqual(res.variableNames, ['authToken', 'userId', 'isActive', 'userMeta', 'reqId', 'fullBody']);
      assert.equal(res.extractedVariables.authToken, 'token-abc');
      assert.equal(res.extractedVariables.userId, '101');
      assert.equal(res.extractedVariables.isActive, 'false');
      assert.equal(res.extractedVariables.userMeta, 'null');
      assert.equal(res.extractedVariables.reqId, 'req-xyz-789');
      assert.equal(typeof res.extractedVariables.fullBody, 'string');
    });

    it('should fail extraction if a JSON path is missing', () => {
      const response = {
        status: 200,
        headers: {},
        body: { id: 1 },
      };

      const rules = [
        { variable: 'token', source: 'json', path: '$.missingToken' },
      ];

      const res = extractVariablesFromResponse(response, rules);
      assert.equal(res.success, false);
      assert.match(res.error, /not found/i);
      assert.deepEqual(res.extractedVariables, {});
    });

    it('should fail extraction if header is missing', () => {
      const response = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: {},
      };

      const rules = [
        { variable: 'traceId', source: 'header', header: 'X-Trace-Id' },
      ];

      const res = extractVariablesFromResponse(response, rules);
      assert.equal(res.success, false);
      assert.match(res.error, /header 'X-Trace-Id' not found/i);
    });
  });

  describe('Integration: Collection Runner Request Chaining', () => {
    let appServer;
    let baseUrl;
    let mockServer;
    let mockServerUrl;

    const mockReceivedRequests = [];

    let user;
    let token;
    let workspaceId;
    let collectionId;

    before(async () => {
      // 1. Start App Server
      await new Promise((resolve) => {
        appServer = app.listen(0, () => {
          const port = appServer.address().port;
          baseUrl = `http://127.0.0.1:${port}/api`;
          resolve();
        });
      });

      // 2. Start Mock Target Server
      mockServer = http.createServer((req, res) => {
        let reqBody = '';
        req.on('data', (chunk) => {
          reqBody += chunk;
        });

        req.on('end', () => {
          mockReceivedRequests.push({
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: reqBody,
          });

          // Route 1: POST /mock/login -> returns JWT token
          if (req.method === 'POST' && req.url === '/mock/login') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Session-Id': 'sess-secret-999',
            });
            res.end(JSON.stringify({
              token: 'auth-jwt-token-xyz',
              user: { id: 'usr-1001', role: 'admin' },
            }));
            return;
          }

          // Route 2: GET /mock/profile -> requires Bearer token
          if (req.method === 'GET' && req.url === '/mock/profile') {
            const authHeader = req.headers['authorization'];
            if (authHeader !== 'Bearer auth-jwt-token-xyz') {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized: missing or invalid token' }));
              return;
            }
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'X-Tenant-Id': 'tenant-456',
            });
            res.end(JSON.stringify({
              id: 'usr-1001',
              email: 'chain@example.com',
              accountId: 'acc-777',
            }));
            return;
          }

          // Route 3: GET /mock/orders -> requires query params and tenant header
          if (req.method === 'GET' && req.url.startsWith('/mock/orders')) {
            const urlObj = new URL(req.url, 'http://localhost');
            const accountId = urlObj.searchParams.get('accountId');
            const tenantId = req.headers['x-tenant-id'];

            if (accountId !== 'acc-777' || tenantId !== 'tenant-456') {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing chained accountId or tenantId' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              orders: [
                { id: 'ord-1', total: 150 },
                { id: 'ord-2', total: 300 },
              ],
            }));
            return;
          }

          // Route 4: GET /mock/plaintext
          if (req.method === 'GET' && req.url === '/mock/plaintext') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('RAW_DATA_12345');
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        });
      });

      await new Promise((resolve) => {
        mockServer.listen(0, () => {
          const port = mockServer.address().port;
          mockServerUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });

      // Register test user & create workspace + collection
      const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `chain_tester_${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'Chain Tester',
        }),
      });
      const regData = await regRes.json();
      user = regData.data.user;
      token = regData.data.accessToken;

      const wsRes = await fetch(`${baseUrl}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Chaining Workspace' }),
      });
      const wsData = await wsRes.json();
      workspaceId = wsData.data.workspace.id;

      const colRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: 'Auth & Chaining Collection' }),
      });
      const colData = await colRes.json();
      collectionId = colData.data.collection.id;
    });

    after(async () => {
      if (mockServer) {
        await new Promise((resolve) => mockServer.close(resolve));
      }
      if (appServer) {
        await new Promise((resolve) => appServer.close(resolve));
      }

      if (workspaceId) {
        await prisma.workspace.delete({ where: { id: workspaceId } }).catch(() => {});
      }
      if (user?.id) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
      }
    });

    it('should sequentially execute 3 chained requests with JSON and header extractions', async () => {
      // 1. Create Request 1: POST /mock/login -> extract accessToken and sessionHeader
      const r1Res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: '1. Login',
          method: 'POST',
          url: `${mockServerUrl}/mock/login`,
          settings: {
            extract: [
              { variable: 'accessToken', source: 'json', path: '$.token' },
              { variable: 'sessionHeader', source: 'header', header: 'X-Session-Id' },
            ],
          },
        }),
      });
      assert.equal(r1Res.status, 201);
      const req1 = (await r1Res.json()).data.request;

      // 2. Create Request 2: GET /mock/profile -> uses {{accessToken}}, extracts accountId & tenantHeader
      const r2Res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: '2. Get Profile',
          method: 'GET',
          url: `${mockServerUrl}/mock/profile`,
          headers: [
            { key: 'Authorization', value: 'Bearer {{accessToken}}', enabled: true },
          ],
          settings: {
            extract: [
              { variable: 'accId', source: 'json', path: '$.accountId' },
              { variable: 'tenantId', source: 'header', header: 'x-tenant-id' },
            ],
          },
        }),
      });
      assert.equal(r2Res.status, 201);
      const req2 = (await r2Res.json()).data.request;

      // 3. Create Request 3: GET /mock/orders?accountId={{accId}} with X-Tenant-Id: {{tenantId}}
      const r3Res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: '3. Get Orders',
          method: 'GET',
          url: `${mockServerUrl}/mock/orders`,
          queryParams: [
            { key: 'accountId', value: '{{accId}}', enabled: true },
          ],
          headers: [
            { key: 'X-Tenant-Id', value: '{{tenantId}}', enabled: true },
          ],
        }),
      });
      assert.equal(r3Res.status, 201);
      const req3 = (await r3Res.json()).data.request;

      // Execute collection runner
      const runRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
          requestIds: [req1.id, req2.id, req3.id],
        }),
      });

      assert.equal(runRes.status, 200);
      const runBody = await runRes.json();
      assert.equal(runBody.success, true);

      const summary = runBody.data.summary;
      assert.equal(summary.total, 3);
      assert.equal(summary.passed, 3);
      assert.equal(summary.failed, 0);
      assert.equal(summary.skipped, 0);

      const results = runBody.data.results;
      // Request 1 extraction metadata
      assert.equal(results[0].success, true);
      assert.equal(results[0].extraction.success, true);
      assert.deepEqual(results[0].extraction.variables, ['accessToken', 'sessionHeader']);

      // Request 2 extraction metadata
      assert.equal(results[1].success, true);
      assert.equal(results[1].extraction.success, true);
      assert.deepEqual(results[1].extraction.variables, ['accId', 'tenantId']);

      // Request 3 execution success
      assert.equal(results[2].success, true);
      assert.equal(results[2].extraction, null);

      // Verify the mock server actually received the substituted chained values
      const profileReq = mockReceivedRequests.find((r) => r.url === '/mock/profile');
      assert.ok(profileReq);
      assert.equal(profileReq.headers['authorization'], 'Bearer auth-jwt-token-xyz');

      const ordersReq = mockReceivedRequests.find((r) => r.url.startsWith('/mock/orders'));
      assert.ok(ordersReq);
      assert.match(ordersReq.url, /accountId=acc-777/);
      assert.equal(ordersReq.headers['x-tenant-id'], 'tenant-456');

      // Security check: Verify that extracted variable values (e.g. auth-jwt-token-xyz) NEVER appear in runner response
      const responseStr = JSON.stringify(runBody);
      assert.equal(responseStr.includes('auth-jwt-token-xyz'), false);
      assert.equal(responseStr.includes('sess-secret-999'), false);
    });

    it('should respect variable precedence: explicit runtime var > extracted var > env var', async () => {
      // Create environment with envVar = 'env_value'
      const envRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Precedence Env',
        }),
      });
      const env = (await envRes.json()).data.environment;

      await fetch(`${baseUrl}/workspaces/${workspaceId}/environments/${env.id}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key: 'myVar',
          value: 'from_environment',
        }),
      });

      // Request 1: extracts myVar -> 'from_extraction'
      const r1Res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Extractor',
          method: 'POST',
          url: `${mockServerUrl}/mock/login`,
          settings: {
            extract: [
              { variable: 'myVar', source: 'json', path: '$.token' }, // extracts 'auth-jwt-token-xyz'
            ],
          },
        }),
      });
      const r1 = (await r1Res.json()).data.request;

      // Request 2: passes {{myVar}} in header
      const r2Res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Consumer',
          method: 'GET',
          url: `${mockServerUrl}/mock/plaintext`,
          headers: [
            { key: 'X-Precedence-Test', value: '{{myVar}}', enabled: true },
          ],
        }),
      });
      const r2 = (await r2Res.json()).data.request;

      // Case A: Extracted variable overrides environment variable
      mockReceivedRequests.length = 0;
      const runResA = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
          environmentId: env.id,
          requestIds: [r1.id, r2.id],
        }),
      });
      assert.equal(runResA.status, 200);
      const plaintextReqA = mockReceivedRequests.find((r) => r.url === '/mock/plaintext');
      assert.equal(plaintextReqA.headers['x-precedence-test'], 'auth-jwt-token-xyz');

      // Case B: Explicit runtime variable overrides extracted variable
      mockReceivedRequests.length = 0;
      const runResB = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
          environmentId: env.id,
          runtimeVariables: {
            myVar: 'explicit_runtime_override',
          },
          requestIds: [r1.id, r2.id],
        }),
      });
      assert.equal(runResB.status, 200);
      const plaintextReqB = mockReceivedRequests.find((r) => r.url === '/mock/plaintext');
      assert.equal(plaintextReqB.headers['x-precedence-test'], 'explicit_runtime_override');
    });

    it('should halt and skip subsequent requests on extraction failure when stopOnError is true', async () => {
      // Request with failing extraction rule
      const rFailRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Extraction Failure Req',
          method: 'POST',
          url: `${mockServerUrl}/mock/login`,
          settings: {
            extract: [
              { variable: 'missingVar', source: 'json', path: '$.non_existent_key' },
            ],
          },
        }),
      });
      const reqFail = (await rFailRes.json()).data.request;

      const rFollowRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Should Be Skipped',
          method: 'GET',
          url: `${mockServerUrl}/mock/plaintext`,
        }),
      });
      const reqFollow = (await rFollowRes.json()).data.request;

      const runRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
          stopOnError: true,
          requestIds: [reqFail.id, reqFollow.id],
        }),
      });

      assert.equal(runRes.status, 200);
      const body = await runRes.json();
      assert.equal(body.data.summary.total, 2);
      assert.equal(body.data.summary.failed, 1);
      assert.equal(body.data.summary.skipped, 1);
      assert.equal(body.data.summary.status, 'STOPPED');

      const results = body.data.results;
      assert.equal(results[0].success, false);
      assert.equal(results[0].errorType, 'EXTRACTION_ERROR');
      assert.match(results[0].errorMessage, /not found/i);
      assert.equal(results[0].extraction.success, false);

      assert.equal(results[1].skipped, true);
    });

    it('should continue when stopOnError is false on extraction failure', async () => {
      // Re-use failing request and a standalone follower that does not need the missing var
      const rFailRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Failing Extractor',
          method: 'POST',
          url: `${mockServerUrl}/mock/login`,
          settings: {
            extract: [
              { variable: 'missingVar', source: 'json', path: '$.not_there' },
            ],
          },
        }),
      });
      const reqFail = (await rFailRes.json()).data.request;

      const rFollowRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: 'Independent Follower',
          method: 'GET',
          url: `${mockServerUrl}/mock/plaintext`,
        }),
      });
      const reqFollow = (await rFollowRes.json()).data.request;

      const runRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
          stopOnError: false,
          requestIds: [reqFail.id, reqFollow.id],
        }),
      });

      assert.equal(runRes.status, 200);
      const body = await runRes.json();
      assert.equal(body.data.summary.total, 2);
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 1);
      assert.equal(body.data.summary.skipped, 0);

      assert.equal(body.data.results[0].success, false);
      assert.equal(body.data.results[0].errorType, 'EXTRACTION_ERROR');
      assert.equal(body.data.results[1].success, true);
    });

    it('should not persist extracted variables to the database environment or variables tables', async () => {
      const varCountBefore = await prisma.environmentVariable.count();

      // Run collection with extractions
      await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
        }),
      });

      const varCountAfter = await prisma.environmentVariable.count();
      assert.equal(varCountBefore, varCountAfter);
    });
  });
});

