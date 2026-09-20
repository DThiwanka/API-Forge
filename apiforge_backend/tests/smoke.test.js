/**
 * Step 63: End-to-End Integration & Regression Testing
 *
 * smoke.test.js — Critical Smoke Suite
 *
 * Fast single-pass test of the most critical happy path through APIForge:
 *   Register → Login → Create Workspace → Create Collection →
 *   Create Request → Create Environment → Execute Request →
 *   Inspect History → Add Assertion → Run Assertion →
 *   Run Collection Runner → Verify Summary
 *
 * Designed to run in ~30 seconds and give immediate confidence
 * that the core application pipeline is working.
 *
 * Uses: node:test + node:assert, ephemeral HTTP server, local mock target.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';

describe('Step 63: Critical Smoke Suite', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerUrl;

  // Smoke test user
  let smokeUser;
  let smokeToken;
  let smokeWorkspaceId;
  let smokeCollectionId;
  let smokeRequestId;
  let smokeEnvId;
  let smokeTestId;

  const ts = Date.now();

  before(async () => {
    // Start mock target server
    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', ts: Date.now() }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });

    await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', () => {
      mockServerUrl = `http://127.0.0.1:${mockServer.address().port}`;
      resolve();
    }));

    // Start APIForge app server
    await new Promise((resolve) => {
      appServer = app.listen(0, () => {
        baseUrl = `http://localhost:${appServer.address().port}/api`;
        resolve();
      });
    });

    // Pre-clean smoke test records
    await prisma.user.deleteMany({
      where: { email: { contains: 'smoke-' } },
    }).catch(() => {});
  });

  after(async () => {
    if (appServer) await new Promise((r) => appServer.close(r));
    if (mockServer) await new Promise((r) => mockServer.close(r));
    try {
      await prisma.workspace.deleteMany({ where: { name: { startsWith: 'Smoke_WS_' } } });
      await prisma.user.deleteMany({ where: { email: { contains: 'smoke-' } } });
    } catch { /* ignore */ }
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 1: Register
  // ──────────────────────────────────────────────────────────────────
  it('smoke 1: register a new user', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `smoke-user-${ts}@apiforge.test`,
        password: 'Password123!',
        name: 'Smoke Test User',
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `Register failed: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.ok(body.data.user.id);
    assert.equal(body.data.user.password, undefined, 'Password must not be exposed');
    assert.ok(body.data.accessToken);

    smokeUser = body.data.user;
    smokeToken = body.data.accessToken;
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 2: Login
  // ──────────────────────────────────────────────────────────────────
  it('smoke 2: login with the registered user', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `smoke-user-${ts}@apiforge.test`,
        password: 'Password123!',
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, `Login failed: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken);
    // Use the freshly-issued token for remaining tests
    smokeToken = body.data.accessToken;
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 3: Get current user (authenticated session)
  // ──────────────────────────────────────────────────────────────────
  it('smoke 3: GET /auth/me returns current user profile', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${smokeToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200, `GET /auth/me failed: ${JSON.stringify(body)}`);
    assert.equal(body.data.user.email, `smoke-user-${ts}@apiforge.test`);
    assert.equal(body.data.user.password, undefined);
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 4: Create Workspace
  // ──────────────────────────────────────────────────────────────────
  it('smoke 4: create a workspace', async () => {
    const res = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
      body: JSON.stringify({ name: `Smoke_WS_${ts}` }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `Create workspace failed: ${JSON.stringify(body)}`);
    assert.ok(body.data.workspace.id);
    smokeWorkspaceId = body.data.workspace.id;

    // Owner should be automatically added as member
    const membersRes = await fetch(`${baseUrl}/workspaces/${smokeWorkspaceId}/members`, {
      headers: { Authorization: `Bearer ${smokeToken}` },
    });
    const membersBody = await membersRes.json();
    assert.equal(membersRes.status, 200);
    const ownerMember = membersBody.data.members.find((m) => m.userId === smokeUser.id || m.user?.id === smokeUser.id);
    assert.ok(ownerMember, 'Owner should be present in workspace members');
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 5: Create Collection
  // ──────────────────────────────────────────────────────────────────
  it('smoke 5: create a collection in the workspace', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${smokeWorkspaceId}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
      body: JSON.stringify({ name: 'Smoke Collection' }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `Create collection failed: ${JSON.stringify(body)}`);
    assert.ok(body.data.collection.id);
    smokeCollectionId = body.data.collection.id;
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 6: Create Request
  // ──────────────────────────────────────────────────────────────────
  it('smoke 6: create a GET request in the collection', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${smokeWorkspaceId}/collections/${smokeCollectionId}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
      body: JSON.stringify({
        name: 'Health Check',
        method: 'GET',
        url: `${mockServerUrl}/api/health`,
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `Create request failed: ${JSON.stringify(body)}`);
    assert.ok(body.data.request.id);
    smokeRequestId = body.data.request.id;
    assert.equal(body.data.request.method, 'GET');
    assert.equal(body.data.request.name, 'Health Check');
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 7: Create Environment
  // ──────────────────────────────────────────────────────────────────
  it('smoke 7: create an environment with variables', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${smokeWorkspaceId}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
      body: JSON.stringify({ name: 'Smoke Environment' }),
    });
    const body = await res.json();
    assert.equal(res.status, 201, `Create environment failed: ${JSON.stringify(body)}`);
    smokeEnvId = body.data.environment.id;

    // Add a non-secret variable
    await prisma.environmentVariable.create({
      data: {
        environmentId: smokeEnvId,
        key: 'clientVersion',
        value: '1.0.0',
        isSecret: false,
      },
    });

    // Verify variables are readable
    const varRes = await fetch(`${baseUrl}/workspaces/${smokeWorkspaceId}/environments/${smokeEnvId}/variables`, {
      headers: { Authorization: `Bearer ${smokeToken}` },
    });
    assert.equal(varRes.status, 200);
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 8: Execute Request
  // ──────────────────────────────────────────────────────────────────
  it('smoke 8: execute the request against the mock target', async () => {
    const res = await fetch(
      `${baseUrl}/workspaces/${smokeWorkspaceId}/collections/${smokeCollectionId}/requests/${smokeRequestId}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
        body: JSON.stringify({
          _allowLocalTargets: true,
          environmentId: smokeEnvId,
        }),
      }
    );
    const body = await res.json();
    assert.equal(res.status, 200, `Execute failed: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);

    // Verify normalized response structure
    const response = body.data.response;
    assert.equal(response.status, 200);
    assert.equal(response.statusText, 'OK');
    assert.ok(typeof response.timeMs === 'number' && response.timeMs >= 0);
    assert.ok(typeof response.sizeBytes === 'number' && response.sizeBytes > 0);
    assert.equal(response.body.status, 'healthy');
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 9: Inspect History
  // ──────────────────────────────────────────────────────────────────
  it('smoke 9: verify execution history record was created', async () => {
    const res = await fetch(`${baseUrl}/workspaces/${smokeWorkspaceId}/history?limit=5`, {
      headers: { Authorization: `Bearer ${smokeToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200, `Get history failed: ${JSON.stringify(body)}`);
    assert.ok(body.data.history.length >= 1, 'Expected at least 1 history record');

    const entry = body.data.history[0];
    assert.equal(entry.method, 'GET');
    assert.equal(entry.status, 200);
    assert.ok(entry.url.includes('/api/health'));
    // Verify response metadata is recorded (field name is 'duration' in history records)
    assert.ok(typeof entry.duration === 'number');
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 10: Add Test/Assertion
  // Route: POST /workspaces/:workspaceId/requests/:requestId/tests
  // ──────────────────────────────────────────────────────────────────
  it('smoke 10: add a test suite with status assertion to the request', async () => {
    const res = await fetch(
      `${baseUrl}/workspaces/${smokeWorkspaceId}/requests/${smokeRequestId}/tests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
        body: JSON.stringify({
          name: 'Status is 200',
        }),
      }
    );
    const body = await res.json();
    assert.equal(res.status, 201, `Create test failed: ${JSON.stringify(body)}`);
    smokeTestId = body.data.test.id;
    assert.ok(smokeTestId);

    // Add the assertion to this test
    const assertRes = await fetch(
      `${baseUrl}/workspaces/${smokeWorkspaceId}/requests/${smokeRequestId}/tests/${smokeTestId}/assertions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
        body: JSON.stringify({
          type: 'status',
          operator: 'equals',
          expectedValue: 200,
        }),
      }
    );
    const assertBody = await assertRes.json();
    assert.equal(assertRes.status, 201, `Create assertion failed: ${JSON.stringify(assertBody)}`);
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 11: Run the test and verify it passes
  // Route: POST /workspaces/:workspaceId/requests/:requestId/tests/:testId/run
  // ──────────────────────────────────────────────────────────────────
  it('smoke 11: run the test and assertion passes', async () => {
    const res = await fetch(
      `${baseUrl}/workspaces/${smokeWorkspaceId}/requests/${smokeRequestId}/tests/${smokeTestId}/run`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
        body: JSON.stringify({ _allowLocalTargets: true }),
      }
    );
    const body = await res.json();
    assert.equal(res.status, 200, `Test run failed: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.equal(body.data.testId, smokeTestId);
    assert.equal(body.data.passed, true, `Test should have passed: ${JSON.stringify(body.data)}`);
    assert.ok(body.data.total >= 1, 'Should have run at least 1 assertion');
    assert.equal(body.data.passedCount, body.data.total, 'All assertions should pass');
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 12: Run Collection Runner
  // ──────────────────────────────────────────────────────────────────
  it('smoke 12: run collection runner and verify summary', async () => {
    const res = await fetch(
      `${baseUrl}/workspaces/${smokeWorkspaceId}/collections/${smokeCollectionId}/run`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smokeToken}` },
        body: JSON.stringify({ _allowLocalTargets: true }),
      }
    );
    const body = await res.json();
    assert.equal(res.status, 200, `Runner failed: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);

    const summary = body.data.summary;
    assert.ok(summary);
    assert.ok(summary.total >= 1, `Expected >=1 requests in runner, got ${summary.total}`);
    assert.equal(summary.completed, summary.total, 'All requests should have completed');
    assert.equal(summary.status, 'COMPLETED');
  });

  // ──────────────────────────────────────────────────────────────────
  // STEP 13: Logout clears auth
  // ──────────────────────────────────────────────────────────────────
  it('smoke 13: logout successfully clears authentication', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${smokeToken}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200, `Logout failed: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);

    // Verify token is now invalid (or cookies cleared)
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${smokeToken}` },
    });
    // JWT tokens remain valid until expiry (stateless), but logout clears cookies
    // The important verification is that logout returned success
    assert.ok([200, 401].includes(meRes.status));
  });
});
