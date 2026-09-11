import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('API Request Execution History Integration Tests', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerUrl;

  // Workspace users
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

  async function executeRequest(token, wsId, collId, reqId, body = {}) {
    const res = await fetch(
      `${baseUrl}/workspaces/${wsId}/collections/${collId}/requests/${reqId}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );
    const resBody = await res.json();
    return { status: res.status, body: resBody };
  }

  before(async () => {
    // 1. Start ephemeral mock server
    mockServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

      if (parsedUrl.pathname === '/mock-success') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'success', query: Object.fromEntries(parsedUrl.searchParams) }));
        return;
      }

      if (parsedUrl.pathname === '/mock-not-found') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Resource not found' }));
        return;
      }

      if (parsedUrl.pathname === '/mock-server-error') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server exploded' }));
        return;
      }

      if (parsedUrl.pathname === '/mock-slow') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ slow: true }));
        }, 300);
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
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
    const ownerData = await registerUser(`hist-owner-${Date.now()}@example.com`, 'Hist Owner');
    ownerUser = ownerData.user;
    ownerToken = ownerData.token;

    const memberData = await registerUser(`hist-member-${Date.now()}@example.com`, 'Hist Member');
    memberUser = memberData.user;
    memberToken = memberData.token;

    const viewerData = await registerUser(`hist-viewer-${Date.now()}@example.com`, 'Hist Viewer');
    viewerUser = viewerData.user;
    viewerToken = viewerData.token;

    const strangerData = await registerUser(`hist-stranger-${Date.now()}@example.com`, 'Hist Stranger');
    strangerUser = strangerData.user;
    strangerToken = strangerData.token;

    const ws = await createWorkspace(ownerToken, `History Test WS ${Date.now()}`);
    workspaceId = ws.id;

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: memberUser.id,
        role: WORKSPACE_ROLES.MEMBER,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: viewerUser.id,
        role: WORKSPACE_ROLES.VIEWER,
      },
    });

    const coll = await createCollection(ownerToken, workspaceId, 'History Collection');
    collectionId = coll.id;

    // Unrelated workspace for isolation testing
    const otherWs = await createWorkspace(strangerToken, `Stranger WS ${Date.now()}`);
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

  describe('Execution Record Creation & Sanitization', () => {
    let successReqId;
    let notFoundReqId;
    let serverErrorReqId;
    let timeoutReqId;
    let ssrfReqId;
    let secretReqId;

    it('should record execution history for a successful 200 HTTP request', async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Success Test Request',
        method: 'GET',
        url: `${mockServerUrl}/mock-success`,
      });
      successReqId = req.id;

      const execRes = await executeRequest(ownerToken, workspaceId, collectionId, req.id, {
        _allowLocalTargets: true,
      });
      assert.equal(execRes.status, 200);

      // Verify history record
      const histRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?requestId=${req.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const histBody = await histRes.json();
      assert.equal(histRes.status, 200);
      assert.equal(histBody.success, true);
      assert.ok(histBody.data.history.length >= 1);

      const item = histBody.data.history[0];
      assert.equal(item.method, 'GET');
      assert.equal(item.status, 200);
      assert.equal(item.statusText, 'OK');
      assert.equal(item.success, true);
      assert.equal(item.errorType, null);
      assert.equal(item.errorMessage, null);
      assert.ok(item.duration >= 0);
      assert.ok(item.responseSize > 0);
      assert.equal(item.request.id, req.id);
      assert.equal(item.request.name, 'Success Test Request');
    });

    it('should record execution history for a target 404 response with success=false and errorType=null', async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Not Found Request',
        method: 'GET',
        url: `${mockServerUrl}/mock-not-found`,
      });
      notFoundReqId = req.id;

      const execRes = await executeRequest(ownerToken, workspaceId, collectionId, req.id, {
        _allowLocalTargets: true,
      });
      assert.equal(execRes.status, 200); // Controller returned execution wrapper
      assert.equal(execRes.body.data.response.status, 404);

      const histRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?requestId=${req.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const histBody = await histRes.json();
      const item = histBody.data.history[0];

      assert.equal(item.status, 404);
      assert.equal(item.success, false);
      assert.equal(item.errorType, null);
      assert.equal(item.errorMessage, null);
      assert.ok(item.duration >= 0);
    });

    it('should record execution history for a target 500 response with success=false and errorType=null', async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Server Error Request',
        method: 'GET',
        url: `${mockServerUrl}/mock-server-error`,
      });
      serverErrorReqId = req.id;

      const execRes = await executeRequest(ownerToken, workspaceId, collectionId, req.id, {
        _allowLocalTargets: true,
      });
      assert.equal(execRes.status, 200);
      assert.equal(execRes.body.data.response.status, 500);

      const histRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?requestId=${req.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const histBody = await histRes.json();
      const item = histBody.data.history[0];

      assert.equal(item.status, 500);
      assert.equal(item.success, false);
      assert.equal(item.errorType, null);
      assert.equal(item.errorMessage, null);
    });

    it('should record execution failure for timeout with status=null and errorType=TIMEOUT', async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Timeout Request',
        method: 'GET',
        url: `${mockServerUrl}/mock-slow`,
        settings: { timeout: 50 },
      });
      timeoutReqId = req.id;

      const execRes = await executeRequest(ownerToken, workspaceId, collectionId, req.id, {
        _allowLocalTargets: true,
      });
      assert.equal(execRes.status, 504); // Execution engine correctly surfaces 504 error

      const histRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?requestId=${req.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const histBody = await histRes.json();
      assert.ok(histBody.data.history.length >= 1);
      const item = histBody.data.history[0];

      assert.equal(item.status, null);
      assert.equal(item.success, false);
      assert.equal(item.errorType, 'TIMEOUT');
      assert.ok(item.errorMessage.includes('timed out'));
    });

    it('should record execution failure for SSRF restriction with status=null and errorType=SECURITY', async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'SSRF Attack Request',
        method: 'GET',
        url: 'http://10.0.0.1/private-api',
      });
      ssrfReqId = req.id;

      const execRes = await executeRequest(ownerToken, workspaceId, collectionId, req.id, {
        _allowLocalTargets: false, // Disallow local/private targets
      });
      assert.equal(execRes.status, 403); // SSRF block error

      const histRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?requestId=${req.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const histBody = await histRes.json();
      assert.ok(histBody.data.history.length >= 1);
      const item = histBody.data.history[0];

      assert.equal(item.status, null);
      assert.equal(item.success, false);
      assert.equal(item.errorType, 'SECURITY');
      assert.ok(item.errorMessage.toLowerCase().includes('ssrf') || item.errorMessage.toLowerCase().includes('restricted'));
    });

    it('should sanitize secret environment variables and credentials in history URL', async () => {
      // 1. Create and activate environment with a secret variable
      const envRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: 'Production Env' }),
      });
      const envBody = await envRes.json();
      const envId = envBody.data.environment.id;

      // Add secret variable
      await fetch(`${baseUrl}/workspaces/${workspaceId}/environments/${envId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          key: 'SECRET_API_KEY',
          value: 'ultra-secret-token-98765',
          isSecret: true,
        }),
      });

      // Activate environment
      await fetch(`${baseUrl}/workspaces/${workspaceId}/environments/${envId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // 2. Create request using the secret variable
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Secret Param Request',
        method: 'GET',
        url: `${mockServerUrl}/mock-success?key={{SECRET_API_KEY}}&other=public`,
      });
      secretReqId = req.id;

      const execRes = await executeRequest(ownerToken, workspaceId, collectionId, req.id, {
        _allowLocalTargets: true,
      });
      assert.equal(execRes.status, 200);

      // 3. Inspect recorded history URL
      const histRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?requestId=${req.id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const histBody = await histRes.json();
      const item = histBody.data.history[0];

      assert.ok(!item.url.includes('ultra-secret-token-98765'), 'Raw secret token must not be in history URL');
      assert.ok(item.url.includes('••••••••'), 'Sanitized placeholder must be present in URL');
      assert.equal(item.environmentId, envId);
      assert.equal(item.environment.name, 'Production Env');
    });
  });

  describe('History Querying, Pagination, and Filters', () => {
    it('should support pagination with page and limit parameters', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?page=1&limit=2`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.history.length, 2);
      assert.equal(body.data.pagination.page, 1);
      assert.equal(body.data.pagination.limit, 2);
      assert.ok(body.data.pagination.total >= 5);
      assert.ok(body.data.pagination.totalPages >= 3);
    });

    it('should filter execution history by status and success', async () => {
      const resSuccess = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?status=200&success=true`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const bodySuccess = await resSuccess.json();

      assert.equal(resSuccess.status, 200);
      assert.ok(bodySuccess.data.history.length >= 1);
      for (const item of bodySuccess.data.history) {
        assert.equal(item.status, 200);
        assert.equal(item.success, true);
      }

      const resFail = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?success=false`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const bodyFail = await resFail.json();

      assert.equal(resFail.status, 200);
      assert.ok(bodyFail.data.history.length >= 1);
      for (const item of bodyFail.data.history) {
        assert.equal(item.success, false);
      }
    });

    it('should filter execution history by search term matching url or request name', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?search=mock-not-found`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.ok(body.data.history.length >= 1);
      assert.ok(body.data.history.every((h) => h.url.includes('mock-not-found')));
    });

    it('should reject invalid pagination parameters with 400', async () => {
      const res1 = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?page=0`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      assert.equal(res1.status, 400);

      const res2 = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?limit=150`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      assert.equal(res2.status, 400);
    });

    it('should retrieve a single execution record by ID', async () => {
      const listRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?limit=1`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const listBody = await listRes.json();
      const targetId = listBody.data.history[0].id;

      const singleRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history/${targetId}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const singleBody = await singleRes.json();

      assert.equal(singleRes.status, 200);
      assert.equal(singleBody.success, true);
      assert.equal(singleBody.data.history.id, targetId);
    });

    it('should return 404 when querying a non-existent history ID', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/history/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      assert.equal(res.status, 404);
    });
  });

  describe('Authorization & Workspace Isolation', () => {
    it('should reject non-member (stranger) from listing workspace history with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/history`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('should reject non-member (stranger) from retrieving single history item with 403', async () => {
      const listRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?limit=1`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const listBody = await listRes.json();
      const targetId = listBody.data.history[0].id;

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/history/${targetId}`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('should allow VIEWER to read history but reject VIEWER from deleting individual records with 403', async () => {
      const listRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?limit=1`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const listBody = await listRes.json();
      const targetId = listBody.data.history[0].id;

      const delRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      assert.equal(delRes.status, 403);
    });

    it('should allow MEMBER to delete an individual history record', async () => {
      const listRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history?limit=1`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const listBody = await listRes.json();
      const targetId = listBody.data.history[0].id;

      const delRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history/${targetId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      assert.equal(delRes.status, 200);

      // Verify deletion
      const verifyRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history/${targetId}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      assert.equal(verifyRes.status, 404);
    });

    it('should reject MEMBER from clearing workspace history with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('should allow OWNER or ADMIN to clear workspace history', async () => {
      const clearRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const clearBody = await clearRes.json();

      assert.equal(clearRes.status, 200);
      assert.equal(clearBody.success, true);
      assert.ok(clearBody.data.count > 0);

      // Verify all history for workspace is cleared
      const listRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/history`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const listBody = await listRes.json();

      assert.equal(listRes.status, 200);
      assert.equal(listBody.data.history.length, 0);
      assert.equal(listBody.data.pagination.total, 0);
    });
  });
});

