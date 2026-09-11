import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('API Testing & Assertions Integration Tests', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerUrl;

  // Users & Tokens
  let ownerUser;
  let ownerToken;

  let memberUser;
  let memberToken;

  let viewerUser;
  let viewerToken;

  let strangerUser;
  let strangerToken;

  let workspaceId;
  let collectionId;
  let otherWorkspaceId;
  let testRequestId;

  async function registerUser(email, name = 'Test User') {
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

  async function addMember(token, wsId, userId, role) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: wsId,
        userId,
        role,
      },
    });
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

  async function createRequest(token, wsId, collId, requestData) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/collections/${collId}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `Failed to create request: ${JSON.stringify(body)}`);
    return body.data.request;
  }

  before(async () => {
    // 1. Ephemeral Mock Server for testing HTTP endpoints
    mockServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

      if (parsedUrl.pathname === '/api/users/me') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'test-val',
        });
        res.end(
          JSON.stringify({
            status: 'ok',
            data: {
              user: {
                id: 1,
                name: 'Alice',
                email: 'alice@example.com',
                role: 'admin',
              },
            },
            items: ['apple', 'banana'],
          })
        );
        return;
      }

      if (parsedUrl.pathname === '/api/slow') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ slow: true }));
        }, 150);
        return;
      }

      if (parsedUrl.pathname === '/api/error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server exploded' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    await new Promise((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => {
        const port = mockServer.address().port;
        mockServerUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 2. Start APIForge App server
    await new Promise((resolve) => {
      appServer = app.listen(0, () => {
        const port = appServer.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // 3. Register users and set up primary workspace
    const ownerData = await registerUser(`test-owner-${Date.now()}@example.com`, 'Test Owner');
    ownerUser = ownerData.user;
    ownerToken = ownerData.token;

    const memberData = await registerUser(`test-member-${Date.now()}@example.com`, 'Test Member');
    memberUser = memberData.user;
    memberToken = memberData.token;

    const viewerData = await registerUser(`test-viewer-${Date.now()}@example.com`, 'Test Viewer');
    viewerUser = viewerData.user;
    viewerToken = viewerData.token;

    const strangerData = await registerUser(`test-stranger-${Date.now()}@example.com`, 'Test Stranger');
    strangerUser = strangerData.user;
    strangerToken = strangerData.token;

    const ws = await createWorkspace(ownerToken, `Testing Workspace ${Date.now()}`);
    workspaceId = ws.id;

    await addMember(ownerToken, workspaceId, memberUser.id, WORKSPACE_ROLES.MEMBER);
    await addMember(ownerToken, workspaceId, viewerUser.id, WORKSPACE_ROLES.VIEWER);

    const coll = await createCollection(ownerToken, workspaceId, 'Testing Collection');
    collectionId = coll.id;

    // Create target test request
    const testReq = await createRequest(ownerToken, workspaceId, collectionId, {
      name: 'Get User Request',
      method: 'GET',
      url: `${mockServerUrl}/api/users/me`,
      settings: { timeout: 3000 },
    });
    testRequestId = testReq.id;

    // Unrelated workspace for isolation testing
    const otherWs = await createWorkspace(strangerToken, `Stranger Workspace ${Date.now()}`);
    otherWorkspaceId = otherWs.id;
  });

  after(async () => {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
    }
    if (appServer) {
      await new Promise((resolve) => appServer.close(resolve));
    }

    try {
      await prisma.apiAssertion.deleteMany({
        where: { test: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } },
      });
      await prisma.apiTest.deleteMany({
        where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } },
      });
      await prisma.requestExecution.deleteMany({
        where: { workspaceId: { in: [workspaceId, otherWorkspaceId] } },
      });
      await prisma.workspace.deleteMany({
        where: { id: { in: [workspaceId, otherWorkspaceId] } },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [ownerUser?.id, memberUser?.id, viewerUser?.id, strangerUser?.id].filter(Boolean),
          },
        },
      });
    } catch {
      // Cleanup best effort
    }
  });

  // ==========================================
  // TEST DEFINITION CRUD
  // ==========================================
  describe('Test Definition CRUD', () => {
    let createdTestId;

    it('should create a test definition with default enabled=true', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            name: 'Smoke Test',
            description: 'Verify 200 OK and user payload',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.test.name, 'Smoke Test');
      assert.equal(body.data.test.description, 'Verify 200 OK and user payload');
      assert.equal(body.data.test.enabled, true);
      assert.equal(body.data.test.requestId, testRequestId);
      assert.equal(body.data.test.workspaceId, workspaceId);
      assert.ok(Array.isArray(body.data.test.assertions));

      createdTestId = body.data.test.id;
    });

    it('should fail to create a test without a name', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            description: 'Missing name',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });

    it('should list all tests for a request', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          headers: { Authorization: `Bearer ${viewerToken}` },
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.data.tests));
      assert.equal(body.data.tests.length, 1);
      assert.equal(body.data.tests[0].id, createdTestId);
    });

    it('should get a test definition by ID', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${createdTestId}`,
        {
          headers: { Authorization: `Bearer ${viewerToken}` },
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.test.id, createdTestId);
      assert.equal(body.data.test.name, 'Smoke Test');
    });

    it('should update a test definition (rename, disable)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${createdTestId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            name: 'Updated Smoke Test',
            enabled: false,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.test.name, 'Updated Smoke Test');
      assert.equal(body.data.test.enabled, false);

      // Re-enable for subsequent tests
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${createdTestId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ enabled: true }),
        }
      );
    });

    it('should delete a test definition', async () => {
      // Create a throwaway test
      const createRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ name: 'To be deleted' }),
        }
      );
      const createBody = await createRes.json();
      const throwawayId = createBody.data.test.id;

      const deleteRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${throwawayId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${ownerToken}` },
        }
      );
      assert.equal(deleteRes.status, 200);

      // Verify not found
      const getRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${throwawayId}`,
        {
          headers: { Authorization: `Bearer ${ownerToken}` },
        }
      );
      assert.equal(getRes.status, 404);
    });
  });

  // ==========================================
  // ASSERTION CRUD & VALIDATION
  // ==========================================
  describe('Assertion CRUD & Validation', () => {
    let testId;
    let assertionId;

    before(async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ name: 'Assertion Test Suite' }),
        }
      );
      const body = await res.json();
      testId = body.data.test.id;
    });

    it('should create a valid status assertion', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            type: 'status',
            operator: 'equals',
            expectedValue: 200,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.assertion.type, 'status');
      assert.equal(body.data.assertion.operator, 'equals');
      assert.equal(body.data.assertion.expectedValue, '200');
      assert.equal(body.data.assertion.position, 0);

      assertionId = body.data.assertion.id;
    });

    it('should reject invalid operator for type (status cannot use contains)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            type: 'status',
            operator: 'contains',
            expectedValue: '200',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });

    it('should reject json_path assertion without a path', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            type: 'json_path',
            operator: 'equals',
            expectedValue: 'Alice',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });

    it('should reject non-numeric expected value for numeric operator', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({
            type: 'response_time',
            operator: 'less_than',
            expectedValue: 'not-a-number',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });

    it('should update an existing assertion', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions/${assertionId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            operator: 'not_equals',
            expectedValue: '404',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.assertion.operator, 'not_equals');
      assert.equal(body.data.assertion.expectedValue, '404');
    });

    it('should delete an assertion', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions/${assertionId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${ownerToken}` },
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
    });
  });

  // ==========================================
  // ASSERTION EVALUATION ENGINE TESTS
  // ==========================================
  describe('Assertion Evaluation Engine', () => {
    it('should execute a test and evaluate all 5 assertion types successfully', async () => {
      // 1. Create a comprehensive test
      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ownerToken}`,
          },
          body: JSON.stringify({ name: 'Comprehensive Evaluation Test' }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      // 2. Add assertion 1: status equals 200
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'status', operator: 'equals', expectedValue: 200 }),
        }
      );

      // 3. Add assertion 2: response_time less_than 5000
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'response_time', operator: 'less_than', expectedValue: 5000 }),
        }
      );

      // 4. Add assertion 3: json_path data.user.name equals Alice
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({
            type: 'json_path',
            path: 'data.user.name',
            operator: 'equals',
            expectedValue: 'Alice',
          }),
        }
      );

      // 5. Add assertion 4: json_path items[1] equals banana
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({
            type: 'json_path',
            path: 'items[1]',
            operator: 'equals',
            expectedValue: 'banana',
          }),
        }
      );

      // 6. Add assertion 5: header x-custom-header equals test-val
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({
            type: 'header',
            path: 'x-custom-header',
            operator: 'equals',
            expectedValue: 'test-val',
          }),
        }
      );

      // 7. Add assertion 6: body_contains contains "Alice"
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({
            type: 'body_contains',
            operator: 'contains',
            expectedValue: 'Alice',
          }),
        }
      );

      // 8. Run the test
      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
          body: JSON.stringify({ _allowLocalTargets: true }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 200);
      assert.equal(runBody.success, true);

      const result = runBody.data;
      assert.equal(result.testId, testId);
      assert.equal(result.passed, true);
      assert.equal(result.total, 6);
      assert.equal(result.passedCount, 6);
      assert.equal(result.failedCount, 0);
      assert.ok(result.duration >= 0);
      assert.equal(result.response.status, 200);
      assert.equal(result.assertions.length, 6);
      assert.ok(result.assertions.every((a) => a.passed === true));
    });

    it('should report passed: false when one assertion fails', async () => {
      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'Partially Failing Test' }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      // Passing assertion
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'status', operator: 'equals', expectedValue: 200 }),
        }
      );

      // Failing assertion: status equals 404
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'status', operator: 'equals', expectedValue: 404 }),
        }
      );

      // Run
      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
          body: JSON.stringify({ _allowLocalTargets: true }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 200);
      const result = runBody.data;
      assert.equal(result.passed, false);
      assert.equal(result.total, 2);
      assert.equal(result.passedCount, 1);
      assert.equal(result.failedCount, 1);
      assert.ok(result.assertions[1].message.includes('Expected status'));
    });

    it('should handle exists and not_exists operators for JSON path and headers', async () => {
      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'Existence Checks Test' }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      // data.user exists -> pass
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'json_path', path: 'data.user', operator: 'exists' }),
        }
      );

      // data.ghost not_exists -> pass
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'json_path', path: 'data.ghost', operator: 'not_exists' }),
        }
      );

      // header x-missing not_exists -> pass
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'header', path: 'x-missing', operator: 'not_exists' }),
        }
      );

      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
          body: JSON.stringify({ _allowLocalTargets: true }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 200);
      assert.equal(runBody.data.passed, true);
      assert.equal(runBody.data.passedCount, 3);
    });

    it('should safely reject prototype pollution paths without throwing error', async () => {
      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'Security Path Test' }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      // Prototype pollution attempt in json_path
      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({
            type: 'json_path',
            path: '__proto__.polluted',
            operator: 'exists',
          }),
        }
      );

      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
          body: JSON.stringify({ _allowLocalTargets: true }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 200);
      // It did not find the polluted path, and did not pollute Object prototype
      assert.equal(runBody.data.passed, false);
      assert.equal(Object.prototype.polluted, undefined);
    });
  });

  // ==========================================
  // DISABLED TEST & EXECUTION FAILURES
  // ==========================================
  describe('Disabled Test & Execution Failure Handling', () => {
    it('should reject running a disabled test with 400 Bad Request', async () => {
      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'Disabled Test', enabled: false }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ _allowLocalTargets: true }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 400);
      assert.equal(runBody.success, false);
      assert.ok(runBody.message.includes('Cannot run a disabled test'));
    });

    it('should return classified error and marked assertions when request fails SSRF protection', async () => {
      // Create request pointing to AWS metadata IP
      const ssrfReq = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'SSRF Target Request',
        method: 'GET',
        url: 'http://169.254.169.254/latest/meta-data',
      });

      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${ssrfReq.id}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'SSRF Test' }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${ssrfReq.id}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'status', operator: 'equals', expectedValue: 200 }),
        }
      );

      // Run with allowLocalTargets=false (default SSRF protection enabled)
      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${ssrfReq.id}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ _allowLocalTargets: false }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 200);
      assert.equal(runBody.data.passed, false);
      assert.equal(runBody.data.errorType, 'SECURITY');
      assert.ok(runBody.data.errorMessage);
      assert.equal(runBody.data.failedCount, 1);
      assert.equal(runBody.data.assertions[0].passed, false);
      assert.ok(runBody.data.assertions[0].message.includes('Request execution failed'));
    });

    it('should return classified TIMEOUT error when request exceeds timeout threshold', async () => {
      // Request targeting slow endpoint with 50ms timeout
      const slowReq = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Slow Request',
        method: 'GET',
        url: `${mockServerUrl}/api/slow`,
        settings: { timeout: 50 },
      });

      const testRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${slowReq.id}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'Timeout Test' }),
        }
      );
      const testBody = await testRes.json();
      const testId = testBody.data.test.id;

      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${slowReq.id}/tests/${testId}/assertions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ type: 'status', operator: 'equals', expectedValue: 200 }),
        }
      );

      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${slowReq.id}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ _allowLocalTargets: true }),
        }
      );

      const runBody = await runRes.json();
      assert.equal(runRes.status, 200);
      assert.equal(runBody.data.passed, false);
      assert.equal(runBody.data.errorType, 'TIMEOUT');
      assert.equal(runBody.data.failedCount, 1);
    });
  });

  // ==========================================
  // WORKSPACE ISOLATION & PERMISSIONS
  // ==========================================
  describe('Workspace Isolation & Permissions', () => {
    let testId;

    before(async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
          body: JSON.stringify({ name: 'Permission Test' }),
        }
      );
      const body = await res.json();
      testId = body.data.test.id;
    });

    it('should deny unauthenticated requests', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`
      );
      assert.equal(res.status, 401);
    });

    it('should deny non-members of workspace from accessing tests', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          headers: { Authorization: `Bearer ${strangerToken}` },
        }
      );
      assert.equal(res.status, 403);
    });

    it('should prevent VIEWER from mutating tests', async () => {
      // Viewer cannot create test
      const createRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
          body: JSON.stringify({ name: 'Viewer Test' }),
        }
      );
      assert.equal(createRes.status, 403);

      // Viewer cannot update test
      const updateRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
          body: JSON.stringify({ name: 'Hacked' }),
        }
      );
      assert.equal(updateRes.status, 403);

      // Viewer cannot run test
      const runRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${testRequestId}/tests/${testId}/run`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerToken}` },
        }
      );
      assert.equal(runRes.status, 403);
    });

    it('should return 404 when request does not belong to specified workspace', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${otherWorkspaceId}/requests/${testRequestId}/tests`,
        {
          headers: { Authorization: `Bearer ${strangerToken}` },
        }
      );
      assert.equal(res.status, 404);
    });
  });
});

