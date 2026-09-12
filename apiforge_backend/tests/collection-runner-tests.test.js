import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';

describe('Collection Runner Test & Assertion Integration Tests', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerUrl;

  let memberUser;
  let memberToken;

  let workspaceId;
  let collectionId;

  async function registerUser(email, name = 'Test Runner User') {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        name,
      }),
    });
    const body = await res.json();
    return { user: body.data.user, token: body.data.accessToken };
  }

  async function createWorkspace(token, name) {
    const res = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    const body = await res.json();
    return body.data.workspace;
  }

  async function createCollection(token, wsId, name) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    const body = await res.json();
    return body.data.collection;
  }

  async function createRequest(token, wsId, collId, payload) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/collections/${collId}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    return body.data.request;
  }

  async function createTest(token, wsId, reqId, name, enabled = true) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/requests/${reqId}/tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, enabled }),
    });
    const body = await res.json();
    return body.data.test;
  }

  async function createAssertion(token, wsId, reqId, testId, data) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/requests/${reqId}/tests/${testId}/assertions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    return body.data.assertion;
  }

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
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === '/api/login') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'Auth-Success',
          Authorization: 'Bearer super-secret-server-token-12345',
        });
        res.end(
          JSON.stringify({
            token: 'jwt-auth-token-xyz789',
            user: { id: 'usr-123', name: 'Alice' },
          })
        );
        return;
      }

      if (url.pathname === '/api/profile') {
        const auth = req.headers.authorization;
        if (auth === 'Bearer jwt-auth-token-xyz789') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-User-Role': 'Admin',
          });
          res.end(
            JSON.stringify({
              userId: 'usr-123',
              role: 'Admin',
              active: true,
            })
          );
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
        }
        return;
      }

      if (url.pathname === '/api/items') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            count: 2,
            items: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
          })
        );
        return;
      }

      if (url.pathname === '/api/not-found') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Resource not found' }));
        return;
      }

      if (url.pathname === '/api/failing') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', value: 42 }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });

    await new Promise((resolve) => {
      mockServer.listen(0, () => {
        const port = mockServer.address().port;
        mockServerUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Register user and create workspace
    const authData = await registerUser(`runner-tests-${Date.now()}@example.com`);
    memberUser = authData.user;
    memberToken = authData.token;

    const ws = await createWorkspace(memberToken, 'Runner Tests Workspace');
    workspaceId = ws.id;

    const coll = await createCollection(memberToken, workspaceId, 'Runner Test Collection');
    collectionId = coll.id;
  });

  after(async () => {
    if (appServer) await new Promise((r) => appServer.close(r));
    if (mockServer) await new Promise((r) => mockServer.close(r));
  });

  describe('1. No Tests vs Saved Tests Execution', () => {
    it('executes request with no tests normally without test failures', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'No Tests Request',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.summary.total, 1);
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.tests.total, 0);
      assert.equal(body.data.summary.tests.passed, 0);
      assert.equal(body.data.summary.tests.failed, 0);

      const result = body.data.results[0];
      assert.equal(result.success, true);
      assert.equal(result.execution.success, true);
      assert.equal(result.tests.total, 0);
      assert.equal(result.tests.passed, 0);
      assert.equal(result.tests.failed, 0);
      assert.equal(result.tests.executed, true);
      assert.deepEqual(result.tests.results, []);
    });

    it('evaluates single passing assertion on saved request', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Single Test Request',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });

      const test = await createTest(memberToken, workspaceId, req.id, 'Status Test');
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.tests.total, 1);
      assert.equal(body.data.summary.tests.passed, 1);
      assert.equal(body.data.summary.tests.failed, 0);

      const result = body.data.results[0];
      assert.equal(result.success, true);
      assert.equal(result.tests.total, 1);
      assert.equal(result.tests.passed, 1);
      assert.equal(result.tests.failed, 0);
      assert.equal(result.tests.results[0].passed, true);
      assert.equal(result.tests.results[0].assertions[0].passed, true);
    });

    it('evaluates multiple tests and multiple assertion types on a single request', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Multi Assertion Request',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });

      // Test 1: HTTP & Headers
      const test1 = await createTest(memberToken, workspaceId, req.id, 'HTTP & Headers');
      await createAssertion(memberToken, workspaceId, req.id, test1.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
      });
      await createAssertion(memberToken, workspaceId, req.id, test1.id, {
        type: 'header',
        path: 'content-type',
        operator: 'contains',
        expectedValue: 'application/json',
      });

      // Test 2: Body & JSON Path
      const test2 = await createTest(memberToken, workspaceId, req.id, 'Body Content');
      await createAssertion(memberToken, workspaceId, req.id, test2.id, {
        type: 'json_path',
        path: '$.count',
        operator: 'equals',
        expectedValue: '2',
      });
      await createAssertion(memberToken, workspaceId, req.id, test2.id, {
        type: 'json_path',
        path: '$.items[0].id',
        operator: 'exists',
      });
      await createAssertion(memberToken, workspaceId, req.id, test2.id, {
        type: 'body_contains',
        operator: 'contains',
        expectedValue: 'Item 2',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.tests.total, 5);
      assert.equal(body.data.summary.tests.passed, 5);
      assert.equal(body.data.summary.tests.failed, 0);

      const result = body.data.results[0];
      assert.equal(result.tests.total, 5);
      assert.equal(result.tests.passed, 5);
      assert.equal(result.tests.results.length, 2);
    });

    it('ignores disabled tests (enabled: false) and does not execute them', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Disabled Test Request',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });

      const enabledTest = await createTest(memberToken, workspaceId, req.id, 'Active Test', true);
      await createAssertion(memberToken, workspaceId, req.id, enabledTest.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
      });

      const disabledTest = await createTest(memberToken, workspaceId, req.id, 'Disabled Failing Test', false);
      await createAssertion(memberToken, workspaceId, req.id, disabledTest.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '999', // Would fail if executed
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.tests.total, 1);
      assert.equal(body.data.summary.tests.passed, 1);
      assert.equal(body.data.summary.tests.failed, 0);

      const result = body.data.results[0];
      assert.equal(result.tests.results.length, 1);
      assert.equal(result.tests.results[0].name, 'Active Test');
    });
  });

  describe('2. Assertion Failures & Diagnostics', () => {
    it('reports failure when an assertion fails and evaluates remaining assertions in test', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Failing Assertion Request',
        method: 'GET',
        url: `${mockServerUrl}/api/failing`,
      });

      const test = await createTest(memberToken, workspaceId, req.id, 'Validation with Failures');
      // Assertion 1: Passes
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
        position: 0,
      });
      // Assertion 2: Fails
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'json_path',
        path: '$.value',
        operator: 'equals',
        expectedValue: '999',
        position: 1,
      });
      // Assertion 3: Passes (still evaluated!)
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'json_path',
        path: '$.status',
        operator: 'equals',
        expectedValue: 'ok',
        position: 2,
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.passed, 0);
      assert.equal(body.data.summary.failed, 1);
      assert.equal(body.data.summary.tests.total, 3);
      assert.equal(body.data.summary.tests.passed, 2);
      assert.equal(body.data.summary.tests.failed, 1);

      const result = body.data.results[0];
      assert.equal(result.success, false);
      assert.equal(result.execution.success, true); // HTTP execution succeeded
      assert.equal(result.errorType, 'ASSERTION_ERROR');
      assert.ok(result.errorMessage.includes('$.value'));

      assert.equal(result.tests.passed, 2);
      assert.equal(result.tests.failed, 1);
      const assertions = result.tests.results[0].assertions;
      assert.equal(assertions.length, 3);
      assert.equal(assertions[0].passed, true);
      assert.equal(assertions[1].passed, false);
      assert.equal(assertions[2].passed, true);
    });

    it('successfully validates HTTP 404 when status assertion expects 404', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Expect 404 Request',
        method: 'GET',
        url: `${mockServerUrl}/api/not-found`,
      });

      const test = await createTest(memberToken, workspaceId, req.id, 'Expect 404');
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '404',
      });
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'json_path',
        path: '$.message',
        operator: 'equals',
        expectedValue: 'Resource not found',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 0);

      const result = body.data.results[0];
      assert.equal(result.status, 404);
      assert.equal(result.success, true);
      assert.equal(result.execution.success, true);
      assert.equal(result.tests.passed, 2);
      assert.equal(result.tests.failed, 0);
    });
  });

  describe('3. Stop-on-Error with Test Failures', () => {
    it('halts and marks subsequent requests as skipped when stopOnError: true and test fails', async () => {
      const coll = await createCollection(memberToken, workspaceId, 'StopOnError Coll');

      const req1 = await createRequest(memberToken, workspaceId, coll.id, {
        name: 'Step 1 Failing Test',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });
      await prisma.request.update({ where: { id: req1.id }, data: { position: 0 } });

      const test = await createTest(memberToken, workspaceId, req1.id, 'Failing Test');
      await createAssertion(memberToken, workspaceId, req1.id, test.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '500', // Fails since mock returns 200
      });

      const req2 = await createRequest(memberToken, workspaceId, coll.id, {
        name: 'Step 2 Skipped',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });
      await prisma.request.update({ where: { id: req2.id }, data: { position: 1 } });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${coll.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          stopOnError: true,
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.total, 2);
      assert.equal(body.data.summary.completed, 1);
      assert.equal(body.data.summary.passed, 0);
      assert.equal(body.data.summary.failed, 1);
      assert.equal(body.data.summary.skipped, 1);
      assert.equal(body.data.summary.stopped, true);
      assert.equal(body.data.summary.status, 'STOPPED');

      const results = body.data.results;
      assert.equal(results[0].name, 'Step 1 Failing Test');
      assert.equal(results[0].success, false);
      assert.equal(results[0].errorType, 'ASSERTION_ERROR');

      assert.equal(results[1].name, 'Step 2 Skipped');
      assert.equal(results[1].skipped, true);
      assert.equal(results[1].tests, null);
    });

    it('continues executing subsequent requests when stopOnError: false and test fails', async () => {
      const coll = await createCollection(memberToken, workspaceId, 'ContinueOnError Coll');

      const req1 = await createRequest(memberToken, workspaceId, coll.id, {
        name: 'Step 1 Failing Test',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });
      await prisma.request.update({ where: { id: req1.id }, data: { position: 0 } });

      const test = await createTest(memberToken, workspaceId, req1.id, 'Failing Test');
      await createAssertion(memberToken, workspaceId, req1.id, test.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '500',
      });

      const req2 = await createRequest(memberToken, workspaceId, coll.id, {
        name: 'Step 2 Passing Test',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });
      await prisma.request.update({ where: { id: req2.id }, data: { position: 1 } });

      const test2 = await createTest(memberToken, workspaceId, req2.id, 'Passing Test');
      await createAssertion(memberToken, workspaceId, req2.id, test2.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${coll.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          stopOnError: false,
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.total, 2);
      assert.equal(body.data.summary.completed, 2);
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 1);
      assert.equal(body.data.summary.skipped, 0);
      assert.equal(body.data.summary.stopped, false);
      assert.equal(body.data.summary.status, 'FAILED');

      assert.equal(body.data.results[0].success, false);
      assert.equal(body.data.results[1].success, true);
    });
  });

  describe('4. Chained Workflow with Variable Extraction and Assertions', () => {
    it('executes chained workflow: Login (test + extract) -> Profile (resolve + test)', async () => {
      const coll = await createCollection(memberToken, workspaceId, 'Chained Test Coll');

      // Request 1: Login with test and variable extraction
      const reqLogin = await createRequest(memberToken, workspaceId, coll.id, {
        name: 'Login Step',
        method: 'POST',
        url: `${mockServerUrl}/api/login`,
        settings: {
          extract: [
            { source: 'json', path: '$.token', variable: 'sessionToken' },
            { source: 'json', path: '$.user.id', variable: 'currentUserId' },
          ],
        },
      });
      await prisma.request.update({ where: { id: reqLogin.id }, data: { position: 0 } });

      const loginTest = await createTest(memberToken, workspaceId, reqLogin.id, 'Login Assertions');
      await createAssertion(memberToken, workspaceId, reqLogin.id, loginTest.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
      });
      await createAssertion(memberToken, workspaceId, reqLogin.id, loginTest.id, {
        type: 'json_path',
        path: '$.token',
        operator: 'exists',
      });

      // Request 2: Profile using {{sessionToken}} and asserting returned ID
      const reqProfile = await createRequest(memberToken, workspaceId, coll.id, {
        name: 'Profile Step',
        method: 'GET',
        url: `${mockServerUrl}/api/profile`,
        headers: [
          { key: 'Authorization', value: 'Bearer {{sessionToken}}', enabled: true },
        ],
      });
      await prisma.request.update({ where: { id: reqProfile.id }, data: { position: 1 } });

      const profileTest = await createTest(memberToken, workspaceId, reqProfile.id, 'Profile Assertions');
      await createAssertion(memberToken, workspaceId, reqProfile.id, profileTest.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '200',
      });
      await createAssertion(memberToken, workspaceId, reqProfile.id, profileTest.id, {
        type: 'json_path',
        path: '$.userId',
        operator: 'equals',
        expectedValue: 'usr-123',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${coll.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.total, 2);
      assert.equal(body.data.summary.passed, 2);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.tests.total, 4);
      assert.equal(body.data.summary.tests.passed, 4);

      // Verify Login results
      const resLogin = body.data.results[0];
      assert.equal(resLogin.success, true);
      assert.equal(resLogin.tests.passed, 2);
      assert.deepEqual(resLogin.extraction.variables, ['sessionToken', 'currentUserId']);

      // Verify Profile results
      const resProfile = body.data.results[1];
      assert.equal(resProfile.success, true);
      assert.equal(resProfile.tests.passed, 2);
    });
  });

  describe('5. Security & Credential Redaction', () => {
    it('redacts sensitive headers and secrets in assertion outputs', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Sensitive Header Assertions',
        method: 'POST',
        url: `${mockServerUrl}/api/login`,
      });

      const test = await createTest(memberToken, workspaceId, req.id, 'Sensitive Assertions');
      // Assert on Authorization header
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'header',
        path: 'authorization',
        operator: 'equals',
        expectedValue: 'Bearer wrong-secret',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      const result = body.data.results[0];
      const authAssertion = result.tests.results[0].assertions[0];

      assert.equal(authAssertion.passed, false);
      assert.equal(authAssertion.actualValue, '[REDACTED]');
      assert.equal(authAssertion.expectedValue, '[REDACTED]');
      assert.ok(!authAssertion.message.includes('super-secret-server-token-12345'));
    });

    it('respects executeTests: false to bypass test execution when specified', async () => {
      const req = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Bypass Tests Request',
        method: 'GET',
        url: `${mockServerUrl}/api/items`,
      });

      const test = await createTest(memberToken, workspaceId, req.id, 'Failing Test');
      await createAssertion(memberToken, workspaceId, req.id, test.id, {
        type: 'status',
        operator: 'equals',
        expectedValue: '999',
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [req.id],
          executeTests: false,
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.tests.total, 0);
      assert.equal(body.data.results[0].tests.total, 0);
      assert.equal(body.data.results[0].tests.executed, false);
    });
  });
});

