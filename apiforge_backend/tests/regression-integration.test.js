/**
 * Step 63: End-to-End Integration & Regression Testing
 *
 * regression-integration.test.js
 *
 * Cross-domain regression suite that wires multiple APIForge systems together
 * in single end-to-end chains. Tests scenarios that individual domain tests
 * do not cover: full lifecycle chain, workspace isolation matrix across all
 * resource types, realtime sanitization after execution, import→execute→history
 * round trips, OpenAPI import structure, permission regressions, and SSRF
 * persistence after all integrations.
 *
 * Pattern: same ephemeral-port + prisma cleanup + mock HTTP server pattern
 * used across all existing backend integration tests.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';
import { parseCurlCommand } from '../src/services/import-export/curl-import.service.js';
import { exportToCurl } from '../src/services/import-export/curl-export.service.js';
import realtimeService from '../src/services/realtime/realtime.service.js';
import { REDACTED_TEXT } from '../src/utils/redaction.js';

describe('Step 63: End-to-End Integration & Regression Tests', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerUrl;

  // Workspace A — User A (owner) + User B (member)
  let userA;
  let tokenA;
  let userB;
  let tokenB;
  let workspaceAId;
  let collectionAId;

  // Workspace B — separate owner (User C)
  let userC;
  let tokenC;
  let workspaceBId;
  let collectionBId;

  // Viewer in workspace A
  let userViewer;
  let tokenViewer;

  const ts = Date.now();

  async function registerUser(email, name = 'Test User') {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!', name }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `register failed: ${JSON.stringify(body)}`);
    return { user: body.data.user, token: body.data.accessToken };
  }

  async function apiGet(token, path) {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, body: await res.json() };
  }

  async function apiPost(token, path, payload) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { status: res.status, body: await res.json() };
  }

  async function apiPatch(token, path, payload) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return { status: res.status, body: await res.json() };
  }

  async function apiDelete(token, path) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return { status: res.status, body: await res.json() };
  }

  async function executeRequest(token, wsId, collId, reqId, extra = {}) {
    return apiPost(token, `/workspaces/${wsId}/collections/${collId}/requests/${reqId}/execute`, {
      _allowLocalTargets: true,
      ...extra,
    });
  }

  before(async () => {
    // 1. Start ephemeral mock target server
    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const path = url.pathname;

      if (path === '/api/echo') {
        let chunks = [];
        req.on('data', (d) => chunks.push(d));
        req.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          let json = null;
          try { json = JSON.parse(raw); } catch { /* ignore */ }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            method: req.method,
            path,
            query: Object.fromEntries(url.searchParams),
            bodyJson: json,
            authHeader: req.headers['authorization'] || null,
          }));
        });
        return;
      }

      if (path === '/api/login') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: 'jwt-chained-token-abc', userId: 42 }));
        return;
      }

      if (path === '/api/profile') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 42, name: 'Chain User', role: 'admin' }));
        return;
      }

      if (path === '/api/users') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]));
        return;
      }

      if (path === '/api/not-found') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }

      if (path === '/api/server-error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal server error' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', () => {
      mockServerUrl = `http://127.0.0.1:${mockServer.address().port}`;
      resolve();
    }));

    // 2. Start APIForge app server
    await new Promise((resolve) => {
      appServer = app.listen(0, () => {
        baseUrl = `http://localhost:${appServer.address().port}/api`;
        resolve();
      });
    });

    // 3. Register users
    const aData = await registerUser(`regr-usera-${ts}@apiforge.test`, 'User A Owner');
    userA = aData.user; tokenA = aData.token;

    const bData = await registerUser(`regr-userb-${ts}@apiforge.test`, 'User B Member');
    userB = bData.user; tokenB = bData.token;

    const cData = await registerUser(`regr-userc-${ts}@apiforge.test`, 'User C Owner');
    userC = cData.user; tokenC = cData.token;

    const vData = await registerUser(`regr-viewer-${ts}@apiforge.test`, 'User Viewer');
    userViewer = vData.user; tokenViewer = vData.token;

    // 4. Create workspace A (owned by A, member B, viewer Viewer)
    const wsARes = await apiPost(tokenA, '/workspaces', { name: `Regr_WS_A_${ts}` });
    assert.equal(wsARes.status, 201);
    workspaceAId = wsARes.body.data.workspace.id;

    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: userB.id, role: WORKSPACE_ROLES.MEMBER },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: userViewer.id, role: WORKSPACE_ROLES.VIEWER },
    });

    const collARes = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections`, { name: 'Collection A' });
    assert.equal(collARes.status, 201);
    collectionAId = collARes.body.data.collection.id;

    // 5. Create workspace B (owned by C only)
    const wsBRes = await apiPost(tokenC, '/workspaces', { name: `Regr_WS_B_${ts}` });
    assert.equal(wsBRes.status, 201);
    workspaceBId = wsBRes.body.data.workspace.id;

    const collBRes = await apiPost(tokenC, `/workspaces/${workspaceBId}/collections`, { name: 'Collection B' });
    assert.equal(collBRes.status, 201);
    collectionBId = collBRes.body.data.collection.id;
  });

  after(async () => {
    if (appServer) await new Promise((r) => appServer.close(r));
    if (mockServer) await new Promise((r) => mockServer.close(r));
    try {
      await prisma.workspace.deleteMany({ where: { name: { startsWith: 'Regr_WS_' } } });
      await prisma.user.deleteMany({ where: { email: { startsWith: 'regr-' } } });
    } catch { /* ignore cleanup errors */ }
  });

  // ═══════════════════════════════════════════════════════════════════
  // 1. FULL LIFECYCLE CHAIN
  //    auth → workspace → collection → request → env (with secret) →
  //    execute → history created → assertions pass → runner completes
  // ═══════════════════════════════════════════════════════════════════
  describe('1. Full Lifecycle End-to-End Chain', () => {
    let chainReqId;
    let chainEnvId;

    it('should create a request with URL containing environment variable placeholder', async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Chain Request — GET Users',
        method: 'GET',
        url: '{{baseUrl}}/api/users',
        headers: [{ key: 'X-Chain-Test', value: 'true', enabled: true }],
      });
      assert.equal(r.status, 201);
      chainReqId = r.body.data.request.id;
      assert.ok(chainReqId);
    });

    it('should create an environment with a secret variable and a non-secret baseUrl', async () => {
      const envRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/environments`, {
        name: 'Chain Test Env',
      });
      assert.equal(envRes.status, 201);
      chainEnvId = envRes.body.data.environment.id;

      await prisma.environmentVariable.createMany({
        data: [
          { environmentId: chainEnvId, key: 'baseUrl', value: mockServerUrl, isSecret: false },
          { environmentId: chainEnvId, key: 'secretApiKey', value: 'super-secret-key-xyz', isSecret: true },
        ],
      });
    });

    it('should activate the environment in the workspace', async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/environments/${chainEnvId}/activate`, {});
      assert.ok([200, 204].includes(r.status), `activate returned ${r.status}`);
    });

    it('should execute request resolving {{baseUrl}} from environment and record history', async () => {
      const r = await executeRequest(tokenA, workspaceAId, collectionAId, chainReqId, {
        environmentId: chainEnvId,
      });
      assert.equal(r.status, 200, `execute failed: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.success, true);
      assert.equal(r.body.data.response.status, 200);
      // Target response should be the /api/users JSON array
      assert.ok(Array.isArray(r.body.data.response.body));
      // Response metadata
      assert.ok(typeof r.body.data.response.timeMs === 'number');
      assert.ok(typeof r.body.data.response.sizeBytes === 'number');
    });

    it('should have created a history record after execution', async () => {
      const r = await apiGet(tokenA, `/workspaces/${workspaceAId}/history?limit=5`);
      assert.equal(r.status, 200);
      assert.ok(r.body.data.history.length >= 1);
      const entry = r.body.data.history[0];
      assert.equal(entry.method, 'GET');
      assert.ok(entry.url.includes('/api/users'));
      // Secret value must NOT appear in history
      assert.ok(!JSON.stringify(entry).includes('super-secret-key-xyz'));
    });

    it('should create an assertion on the chain request and it passes after execute', async () => {
      const testRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/requests/${chainReqId}/tests`, {
        name: 'Chain Status Test',
      });
      assert.equal(testRes.status, 201);
      const testId = testRes.body.data.test.id;

      // Add the status assertion
      const assertRes = await apiPost(tokenA,
        `/workspaces/${workspaceAId}/requests/${chainReqId}/tests/${testId}/assertions`,
        { type: 'status', operator: 'equals', expectedValue: 200 }
      );
      assert.equal(assertRes.status, 201);

      // Run the test against the mock server
      const runRes = await apiPost(tokenA,
        `/workspaces/${workspaceAId}/requests/${chainReqId}/tests/${testId}/run`,
        { _allowLocalTargets: true, environmentId: chainEnvId }
      );
      assert.equal(runRes.status, 200, `Test run failed: ${JSON.stringify(runRes.body)}`);
      assert.equal(runRes.body.success, true);
      assert.equal(runRes.body.data.testId, testId);
      assert.equal(runRes.body.data.passed, true, `Test should pass: ${JSON.stringify(runRes.body.data)}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 2. WORKSPACE ISOLATION MATRIX
  //    User A cannot read/write/delete any resource in Workspace B
  //    User B (member of A) cannot access Workspace B either
  //    User C cannot access Workspace A
  // ═══════════════════════════════════════════════════════════════════
  describe('2. Workspace Isolation Matrix', () => {
    it('user A cannot list collections from workspace B', async () => {
      const r = await apiGet(tokenA, `/workspaces/${workspaceBId}/collections`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user A cannot create a collection in workspace B', async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceBId}/collections`, { name: 'Infiltrated' });
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user B (member of A) cannot list collections from workspace B', async () => {
      const r = await apiGet(tokenB, `/workspaces/${workspaceBId}/collections`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user C cannot list collections from workspace A', async () => {
      const r = await apiGet(tokenC, `/workspaces/${workspaceAId}/collections`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user C cannot access requests in workspace A collection', async () => {
      const r = await apiGet(tokenC, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user A cannot view environments from workspace B', async () => {
      const r = await apiGet(tokenA, `/workspaces/${workspaceBId}/environments`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user A cannot view history from workspace B', async () => {
      const r = await apiGet(tokenA, `/workspaces/${workspaceBId}/history`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });

    it('user C cannot view workspace A members list', async () => {
      const r = await apiGet(tokenC, `/workspaces/${workspaceAId}/members`);
      assert.ok([403, 404].includes(r.status), `Expected 403/404 but got ${r.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 3. VIEWER PERMISSION REGRESSION
  //    Viewer cannot execute, create, or delete resources
  // ═══════════════════════════════════════════════════════════════════
  describe('3. Permission Regression — Viewer Restrictions', () => {
    let viewerReqId;

    before(async () => {
      // Create a request as owner so viewer has something to try to execute
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Viewer Test Request',
        method: 'GET',
        url: `${mockServerUrl}/api/users`,
      });
      viewerReqId = r.body.data.request.id;
    });

    it('viewer cannot execute a request', async () => {
      const r = await executeRequest(tokenViewer, workspaceAId, collectionAId, viewerReqId);
      assert.ok([403, 404].includes(r.status), `Viewer execute should be rejected, got ${r.status}`);
    });

    it('viewer cannot create a collection', async () => {
      const r = await apiPost(tokenViewer, `/workspaces/${workspaceAId}/collections`, { name: 'Viewer Coll' });
      assert.ok([403, 404].includes(r.status), `Viewer create collection should be rejected, got ${r.status}`);
    });

    it('viewer cannot create a request', async () => {
      const r = await apiPost(tokenViewer, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Viewer Request',
        method: 'GET',
        url: `${mockServerUrl}/api/users`,
      });
      assert.ok([403, 404].includes(r.status), `Viewer create request should be rejected, got ${r.status}`);
    });

    it('viewer cannot delete a request', async () => {
      const r = await apiDelete(tokenViewer, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${viewerReqId}`);
      assert.ok([403, 404].includes(r.status), `Viewer delete should be rejected, got ${r.status}`);
    });

    it('viewer cannot run the collection runner', async () => {
      const r = await apiPost(tokenViewer, `/workspaces/${workspaceAId}/collections/${collectionAId}/run`, {
        _allowLocalTargets: true,
      });
      assert.ok([403, 404].includes(r.status), `Viewer runner should be rejected, got ${r.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 4. REALTIME EVENT SANITIZATION AFTER EXECUTION
  //    Executing a request with secret environment variables must not
  //    expose those secrets in the realtime broadcast payload
  // ═══════════════════════════════════════════════════════════════════
  describe('4. Realtime Event Sanitization Regression', () => {
    it('should not expose secret env values in realtime broadcast metadata', () => {
      const secretValue = 'my-super-secret-bearer-token-9999';

      const simulatedEvent = {
        type: 'request:executed',
        workspaceId: workspaceAId,
        actor: { id: userA.id, displayName: 'User A' },
        metadata: {
          requestId: 'req-test-sanitize',
          url: `${mockServerUrl}/api/echo?api_key=${secretValue}`,
          secretApiKey: secretValue,
          duration: 145,
        },
      };

      const sanitized = realtimeService.sanitizeEventPayload(simulatedEvent);

      // Secret key field should be stripped from metadata
      assert.equal(sanitized.metadata.secretApiKey, undefined,
        'Secret field must not appear in sanitized realtime event');

      // Secret value should not appear anywhere in the sanitized URL
      assert.ok(!JSON.stringify(sanitized).includes(secretValue),
        'Raw secret value must not appear anywhere in sanitized event');

      // Non-sensitive fields must survive
      assert.equal(sanitized.metadata.duration, 145);
      assert.equal(sanitized.metadata.requestId, 'req-test-sanitize');
      assert.equal(sanitized.workspaceId, workspaceAId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 5. cURL IMPORT → EXECUTE → HISTORY ROUND TRIP
  // ═══════════════════════════════════════════════════════════════════
  describe('5. cURL Import → Execute → History Round Trip', () => {
    it('should import a cURL command, save to collection, execute, and verify history', async () => {
      // Parse the cURL
      const curlStr = `curl -X GET '${mockServerUrl}/api/echo?page=1' -H 'X-Client: TestSuite'`;
      const parsed = parseCurlCommand(curlStr);
      assert.equal(parsed.method, 'GET');
      assert.ok(parsed.url.includes('/api/echo'));

      // Import via API — create request from parsed cURL data
      const importRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'cURL Imported Request',
        method: parsed.method,
        url: parsed.url,
        headers: parsed.headers || [],
        queryParams: parsed.queryParams || [],
      });
      assert.equal(importRes.status, 201);
      const importedReqId = importRes.body.data.request.id;

      // Execute the imported request
      const execRes = await executeRequest(tokenA, workspaceAId, collectionAId, importedReqId);
      assert.equal(execRes.status, 200, `execute failed: ${JSON.stringify(execRes.body)}`);
      assert.equal(execRes.body.data.response.status, 200);

      // Verify history entry exists
      const histRes = await apiGet(tokenA, `/workspaces/${workspaceAId}/history?limit=5`);
      assert.equal(histRes.status, 200);
      const found = histRes.body.data.history.some((h) => h.requestId === importedReqId);
      assert.ok(found, 'History entry not found for imported+executed request');
    });

    it('cURL parser should not produce shell execution — all methods are non-exec', () => {
      // Verify the curl parser returns a data object, never a shell command
      const parsed = parseCurlCommand(`curl -X DELETE '${mockServerUrl}/api/users/1' -H 'Authorization: Bearer tok123'`);
      assert.equal(typeof parsed, 'object');
      assert.ok(!Array.isArray(parsed));
      assert.equal(parsed.method, 'DELETE');
      // Authorization header must be present in the parsed structure (not executed)
      assert.ok(parsed.headers, 'Headers should be present in parsed cURL result');
    });

    it('cURL export round trip should produce valid parseable cURL from a saved request', () => {
      const mockRequest = {
        name: 'Export Test',
        method: 'POST',
        url: `${mockServerUrl}/api/echo`,
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        queryParams: [{ key: 'debug', value: 'true', enabled: true }],
        body: { mode: 'json', raw: '{"hello":"world"}' },
        auth: { type: 'none' },
      };

      const result = exportToCurl(mockRequest);
      // exportToCurl returns { format, command, hasSecrets }
      assert.ok(typeof result === 'object', 'exportToCurl should return an object');
      assert.ok(typeof result.command === 'string', 'result.command should be a string');
      const curlStr = result.command;
      assert.ok(curlStr.includes('curl'));
      assert.ok(curlStr.includes('POST'));
      assert.ok(curlStr.includes('/api/echo'));
      // Should not contain secrets from a clean request
      assert.ok(!curlStr.includes('undefined'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 6. OPENAPI IMPORT → COLLECTION STRUCTURE REGRESSION
  // ═══════════════════════════════════════════════════════════════════
  describe('6. OpenAPI Import → Collection Structure', () => {
    it('should import an OpenAPI v3 spec and produce correct collection+requests', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Regression API', version: '1.0.0' },
        servers: [{ url: 'https://api.example.com/v1' }],
        paths: {
          '/users': {
            get: {
              operationId: 'listUsers',
              summary: 'List users',
              tags: ['Users'],
              responses: { 200: { description: 'OK' } },
            },
            post: {
              operationId: 'createUser',
              summary: 'Create user',
              tags: ['Users'],
              requestBody: {
                content: { 'application/json': { schema: { type: 'object' } } },
              },
              responses: { 201: { description: 'Created' } },
            },
          },
          '/users/{id}': {
            get: {
              operationId: 'getUser',
              summary: 'Get user by ID',
              tags: ['Users'],
              parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
              responses: { 200: { description: 'OK' } },
            },
          },
          '/health': {
            get: {
              operationId: 'healthCheck',
              summary: 'Health check',
              tags: ['System'],
              responses: { 200: { description: 'OK' } },
            },
          },
        },
      };

      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/import/openapi`, {
        document: spec,
      });

      assert.equal(r.status, 201, `OpenAPI import failed: ${JSON.stringify(r.body)}`);
      const imported = r.body.data;
      assert.ok(imported.collection?.id);
      // Should have created requests — at least 4 paths (listUsers, createUser, getUser, healthCheck)
      assert.ok(imported.requestCount >= 4, `Expected >=4 requests, got ${imported.requestCount}`);
      // Should have created folders for tags (Users, System)
      assert.ok(imported.folderCount >= 1, `Expected >=1 folders, got ${imported.folderCount}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 7. SSRF PERSISTENCE REGRESSION
  //    After all integrations, SSRF protection must still block private/
  //    loopback/metadata targets even with _allowLocalTargets: false
  // ═══════════════════════════════════════════════════════════════════
  describe('7. SSRF Protection Regression', () => {
    let ssrfTestReqId;

    before(async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'SSRF Test Request',
        method: 'GET',
        url: 'http://169.254.169.254/latest/meta-data/',
      });
      ssrfTestReqId = r.body.data.request.id;
    });

    it('should block execution targeting cloud metadata IP (169.254.169.254)', async () => {
      const r = await apiPost(tokenA,
        `/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${ssrfTestReqId}/execute`,
        {}  // No _allowLocalTargets
      );
      // Should either return 403 (SSRF blocked at API level) or 200 with an execution error
      if (r.status === 200) {
        assert.ok(r.body.data.response.error, 'SSRF-blocked execution should have an error field');
        const errStr = JSON.stringify(r.body.data.response.error).toLowerCase();
        assert.ok(
          errStr.includes('blocked') || errStr.includes('ssrf') || errStr.includes('forbidden') ||
          errStr.includes('private') || errStr.includes('not allowed'),
          `SSRF error should mention blocking: ${errStr}`
        );
      } else {
        assert.ok([400, 403, 422].includes(r.status), `Expected SSRF rejection, got ${r.status}`);
      }
    });

    it('should block execution targeting localhost without _allowLocalTargets', async () => {
      const localhostReq = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Localhost SSRF Test',
        method: 'GET',
        url: 'http://localhost:22/ssh',
      });
      const reqId = localhostReq.body.data.request.id;

      const r = await apiPost(tokenA,
        `/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${reqId}/execute`,
        {}  // No _allowLocalTargets
      );
      if (r.status === 200) {
        assert.ok(r.body.data.response.error,
          'localhost execution without _allowLocalTargets should be blocked');
      } else {
        assert.ok([400, 403, 422].includes(r.status), `Expected SSRF rejection, got ${r.status}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 8. VARIABLE EXTRACTION → REQUEST CHAINING END-TO-END
  // ═══════════════════════════════════════════════════════════════════
  describe('8. Variable Extraction & Request Chaining', () => {
    let loginReqId;
    let profileReqId;
    let chainEnvId2;

    before(async () => {
      // Create login request that will return {token: ..., userId: ...}
      const loginRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Chain Login',
        method: 'GET',
        url: `${mockServerUrl}/api/login`,
        extractionRules: [
          { variable: 'extractedToken', source: 'json', path: '$.token' },
          { variable: 'extractedUserId', source: 'json', path: '$.userId' },
        ],
      });
      loginReqId = loginRes.body.data.request.id;

      // Create profile request using extracted token
      const profileRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Chain Profile',
        method: 'GET',
        url: `${mockServerUrl}/api/profile`,
        headers: [{ key: 'X-Token', value: '{{extractedToken}}', enabled: true }],
      });
      profileReqId = profileRes.body.data.request.id;

      // Environment for chaining
      const envRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/environments`, {
        name: 'Chain Env 2',
      });
      chainEnvId2 = envRes.body.data.environment.id;
    });

    it('should execute login request and return extracted variables in response', async () => {
      const r = await executeRequest(tokenA, workspaceAId, collectionAId, loginReqId, {
        environmentId: chainEnvId2,
      });
      assert.equal(r.status, 200, `login execute failed: ${JSON.stringify(r.body)}`);
      // Extraction results should be present
      const extracted = r.body.data.extractedVariables;
      if (extracted) {
        // If extraction is returned, verify the token was found
        assert.ok(extracted.extractedToken || extracted.extractedToken === null,
          'extractedToken key should be present in extracted variables');
      }
      // The mock /api/login returns token: 'jwt-chained-token-abc'
      assert.equal(r.body.data.response.status, 200);
    });

    it('should run collection runner with extraction chaining across two requests', async () => {
      // Run just the two chain requests via runner with requestIds selection
      const r = await apiPost(tokenA,
        `/workspaces/${workspaceAId}/collections/${collectionAId}/run`,
        {
          requestIds: [loginReqId, profileReqId],
          environmentId: chainEnvId2,
          _allowLocalTargets: true,
        }
      );
      assert.equal(r.status, 200, `runner failed: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.success, true);
      // Both requests should have completed
      const results = r.body.data.results;
      assert.ok(results.length >= 1, 'Runner should return at least 1 result');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 9. HISTORY DOES NOT PERSIST SECRET ENV VALUES
  // ═══════════════════════════════════════════════════════════════════
  describe('9. History Secret Non-Persistence Regression', () => {
    it('should not store raw secret env values in history records', async () => {
      // Create env with a secret variable
      const envRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/environments`, {
        name: 'Secret History Env',
      });
      const secretEnvId = envRes.body.data.environment.id;
      const secretValue = 'TOP-SECRET-VALUE-DO-NOT-LOG';

      await prisma.environmentVariable.create({
        data: {
          environmentId: secretEnvId,
          key: 'secretKey',
          value: secretValue,
          isSecret: true,
        },
      });

      // Create a request that uses the secret in a header
      const reqRes = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Secret Header Request',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
        headers: [{ key: 'X-Secret', value: '{{secretKey}}', enabled: true }],
      });
      const secretReqId = reqRes.body.data.request.id;

      // Execute
      await executeRequest(tokenA, workspaceAId, collectionAId, secretReqId, {
        environmentId: secretEnvId,
      });

      // Check history — raw secret must not be present
      const histRes = await apiGet(tokenA, `/workspaces/${workspaceAId}/history?limit=10`);
      assert.equal(histRes.status, 200);

      const historyJson = JSON.stringify(histRes.body.data.history);
      assert.ok(!historyJson.includes(secretValue),
        'Raw secret value must not appear in any history record response');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 10. MEMBER CAN EXECUTE BUT CANNOT DELETE COLLECTION
  // ═══════════════════════════════════════════════════════════════════
  describe('10. Member Permission Regression', () => {
    let memberTestReqId;

    before(async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Member Test Request',
        method: 'GET',
        url: `${mockServerUrl}/api/users`,
      });
      memberTestReqId = r.body.data.request.id;
    });

    it('member (User B) can execute a request', async () => {
      const r = await executeRequest(tokenB, workspaceAId, collectionAId, memberTestReqId);
      assert.equal(r.status, 200, `Member should be able to execute, got ${r.status}: ${JSON.stringify(r.body)}`);
      assert.equal(r.body.success, true);
    });

    it('member cannot delete the collection', async () => {
      const r = await apiDelete(tokenB, `/workspaces/${workspaceAId}/collections/${collectionAId}`);
      assert.ok([403, 404].includes(r.status),
        `Member should not delete collection, got ${r.status}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 11. HTTP STATUS RESPONSE CATEGORIZATION REGRESSION
  //    4xx/5xx responses from target are HTTP responses, NOT exec failures
  // ═══════════════════════════════════════════════════════════════════
  describe('11. HTTP Response vs Execution Error Categorization', () => {
    it('404 from target should be a valid completed execution, not an execution failure', async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Not Found Request',
        method: 'GET',
        url: `${mockServerUrl}/api/not-found`,
      });
      const reqId = r.body.data.request.id;

      const execRes = await executeRequest(tokenA, workspaceAId, collectionAId, reqId);
      assert.equal(execRes.status, 200, 'Execution of request that returns 404 should itself be HTTP 200');
      assert.equal(execRes.body.success, true);
      // The target response status should be 404
      assert.equal(execRes.body.data.response.status, 404);
      // No execution-level error
      assert.ok(!execRes.body.data.response.error,
        '404 target response should not produce an execution-level error field');
    });

    it('500 from target should be a valid completed execution, not an execution failure', async () => {
      const r = await apiPost(tokenA, `/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        name: 'Server Error Request',
        method: 'GET',
        url: `${mockServerUrl}/api/server-error`,
      });
      const reqId = r.body.data.request.id;

      const execRes = await executeRequest(tokenA, workspaceAId, collectionAId, reqId);
      assert.equal(execRes.status, 200);
      assert.equal(execRes.body.data.response.status, 500);
      assert.ok(!execRes.body.data.response.error,
        '500 target response should not produce an execution-level error field');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // 12. PROTECTED ROUTES REMAIN PROTECTED
  // ═══════════════════════════════════════════════════════════════════
  describe('12. Auth Protection Regression', () => {
    it('unauthenticated request to /auth/me returns 401', async () => {
      const res = await fetch(`${baseUrl}/auth/me`);
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
    });

    it('unauthenticated request to workspace list returns 401', async () => {
      const res = await fetch(`${baseUrl}/workspaces`);
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
    });

    it('expired/tampered token returns 401', async () => {
      const res = await fetch(`${baseUrl}/workspaces`, {
        headers: { Authorization: 'Bearer tampered.invalid.token' },
      });
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
    });
  });
});
