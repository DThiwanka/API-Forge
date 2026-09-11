import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('Collection Runner Backend Integration Tests', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerUrl;

  // Execution tracking on mock server to verify strict sequential execution
  const executionLog = [];

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
  let otherWorkspaceId;

  let collectionId;
  let otherCollectionId;

  let folderAuthId;
  let folderUsersId;
  let folderSubId;

  let reqLogin;
  let reqRefreshToken;
  let reqGetUsers;
  let reqCreateUser;
  let reqSubItem;
  let reqRootHealth;

  let activeEnv;
  let customEnv;

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

  async function createFolder(token, wsId, collId, name, parentId = null) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/collections/${collId}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, parentId }),
    });
    const body = await res.json();
    return body.data.folder;
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
    // 1. Start ephemeral Mock Target HTTP Server
    mockServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const endpoint = parsedUrl.pathname;

      executionLog.push({
        path: endpoint,
        time: Date.now(),
        headers: req.headers,
      });

      if (endpoint === '/api/login') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: 'jwt-mock-token-xyz' }));
      } else if (endpoint === '/api/refresh') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ refreshed: true }));
      } else if (endpoint === '/api/users') {
        if (req.method === 'POST') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: 101, name: 'Alice' }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]));
        }
      } else if (endpoint === '/api/sub-resource') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ nested: true }));
      } else if (endpoint === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy' }));
      } else if (endpoint === '/api/error-400') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request' }));
      } else if (endpoint === '/api/error-500') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      } else if (endpoint === '/api/delayed') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ delayed: true }));
        }, 80);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve));
    mockServerUrl = `http://127.0.0.1:${mockServer.address().port}`;

    // 2. Start Test Express App Server
    appServer = http.createServer(app);
    await new Promise((resolve) => appServer.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${appServer.address().port}/api`;

    // 3. Register Users
    const timestamp = Date.now();
    const ownerData = await registerUser(`runner-owner-${timestamp}@apiforge.test`, 'Runner Owner');
    ownerUser = ownerData.user;
    ownerToken = ownerData.token;

    const memberData = await registerUser(`runner-member-${timestamp}@apiforge.test`, 'Runner Member');
    memberUser = memberData.user;
    memberToken = memberData.token;

    const viewerData = await registerUser(`runner-viewer-${timestamp}@apiforge.test`, 'Runner Viewer');
    viewerUser = viewerData.user;
    viewerToken = viewerData.token;

    const strangerData = await registerUser(`runner-stranger-${timestamp}@apiforge.test`, 'Runner Stranger');
    strangerUser = strangerData.user;
    strangerToken = strangerData.token;

    // 4. Setup primary workspace
    const ws = await createWorkspace(ownerToken, 'Runner Test Workspace');
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

    // Setup foreign workspace for authorization tests
    const otherWs = await createWorkspace(strangerToken, 'Stranger Workspace');
    otherWorkspaceId = otherWs.id;
    const otherColl = await createCollection(strangerToken, otherWorkspaceId, 'Stranger Collection');
    otherCollectionId = otherColl.id;

    // 5. Setup Collection & Folder Hierarchy
    // Collection
    // ├── Authentication (position: 0)
    // │   ├── Login (position: 0)
    // │   └── Refresh Token (position: 1)
    // ├── Users (position: 1)
    // │   ├── Get Users (position: 0)
    // │   ├── Create User (position: 1)
    // │   └── Subfolder (position: 0)
    // │       └── Sub Item (position: 0)
    // └── Health Check (root request, position: 0)

    const coll = await createCollection(memberToken, workspaceId, 'Main API Collection');
    collectionId = coll.id;

    // Folder: Authentication (position 0)
    const fAuth = await createFolder(memberToken, workspaceId, collectionId, 'Authentication');
    folderAuthId = fAuth.id;
    await prisma.folder.update({ where: { id: folderAuthId }, data: { position: 0 } });

    // Folder: Users (position 1)
    const fUsers = await createFolder(memberToken, workspaceId, collectionId, 'Users');
    folderUsersId = fUsers.id;
    await prisma.folder.update({ where: { id: folderUsersId }, data: { position: 1 } });

    // Subfolder inside Users (position 0)
    const fSub = await createFolder(memberToken, workspaceId, collectionId, 'Subfolder', folderUsersId);
    folderSubId = fSub.id;
    await prisma.folder.update({ where: { id: folderSubId }, data: { position: 0 } });

    // Requests in Authentication
    reqLogin = await createRequest(memberToken, workspaceId, collectionId, {
      name: 'Login',
      method: 'POST',
      url: `${mockServerUrl}/api/login`,
      folderId: folderAuthId,
    });
    await prisma.request.update({ where: { id: reqLogin.id }, data: { position: 0 } });

    reqRefreshToken = await createRequest(memberToken, workspaceId, collectionId, {
      name: 'Refresh Token',
      method: 'GET',
      url: `${mockServerUrl}/api/refresh`,
      folderId: folderAuthId,
    });
    await prisma.request.update({ where: { id: reqRefreshToken.id }, data: { position: 1 } });

    // Requests in Users
    reqGetUsers = await createRequest(memberToken, workspaceId, collectionId, {
      name: 'Get Users',
      method: 'GET',
      url: `${mockServerUrl}/api/users`,
      folderId: folderUsersId,
    });
    await prisma.request.update({ where: { id: reqGetUsers.id }, data: { position: 0 } });

    reqCreateUser = await createRequest(memberToken, workspaceId, collectionId, {
      name: 'Create User',
      method: 'POST',
      url: `${mockServerUrl}/api/users`,
      folderId: folderUsersId,
    });
    await prisma.request.update({ where: { id: reqCreateUser.id }, data: { position: 1 } });

    // Request in Subfolder
    reqSubItem = await createRequest(memberToken, workspaceId, collectionId, {
      name: 'Sub Item',
      method: 'GET',
      url: `${mockServerUrl}/api/sub-resource`,
      folderId: folderSubId,
    });
    await prisma.request.update({ where: { id: reqSubItem.id }, data: { position: 0 } });

    // Root Request (no folder)
    reqRootHealth = await createRequest(memberToken, workspaceId, collectionId, {
      name: 'Health Check',
      method: 'GET',
      url: `${mockServerUrl}/api/health`,
      folderId: null,
    });
    await prisma.request.update({ where: { id: reqRootHealth.id }, data: { position: 0 } });

    // 6. Setup Environments
    // Active Environment
    const activeEnvRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/environments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Staging',
      }),
    });
    const activeEnvBody = await activeEnvRes.json();
    activeEnv = activeEnvBody.data.environment;

    await prisma.environmentVariable.createMany({
      data: [
        { environmentId: activeEnv.id, key: 'baseUrl', value: mockServerUrl, isSecret: false },
        { environmentId: activeEnv.id, key: 'secretKey', value: 'SUPER_SECRET_VALUE', isSecret: true },
        { environmentId: activeEnv.id, key: 'envName', value: 'StagingEnv', isSecret: false },
      ],
    });

    // Activate staging
    await fetch(`${baseUrl}/workspaces/${workspaceId}/environments/${activeEnv.id}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    // Custom Environment
    const customEnvRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/environments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: 'Production',
      }),
    });
    const customEnvBody = await customEnvRes.json();
    customEnv = customEnvBody.data.environment;

    await prisma.environmentVariable.createMany({
      data: [
        { environmentId: customEnv.id, key: 'baseUrl', value: mockServerUrl, isSecret: false },
        { environmentId: customEnv.id, key: 'envName', value: 'ProductionEnv', isSecret: false },
      ],
    });
  });

  after(async () => {
    if (appServer) await new Promise((r) => appServer.close(r));
    if (mockServer) await new Promise((r) => mockServer.close(r));
  });

  describe('1. Selection & Deterministic Ordering', () => {
    it('executes entire collection in deterministic hierarchical order', async () => {
      executionLog.length = 0;

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
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
      assert.equal(body.success, true);
      assert.equal(body.data.summary.total, 6);
      assert.equal(body.data.summary.completed, 6);
      assert.equal(body.data.summary.passed, 6);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.skipped, 0);
      assert.equal(body.data.summary.status, 'COMPLETED');

      // Order should follow:
      // Authentication folder (Login, Refresh Token)
      // Users folder (Get Users, Create User, Sub Item inside Subfolder)
      // Root request (Health Check)
      const names = body.data.results.map((r) => r.name);
      assert.deepEqual(names, [
        'Login',
        'Refresh Token',
        'Get Users',
        'Create User',
        'Sub Item',
        'Health Check',
      ]);
    });

    it('executes only selected folder and its recursive child subfolders', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          folderIds: [folderUsersId],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.total, 3);
      assert.equal(body.data.summary.passed, 3);

      // Must include Get Users, Create User, and Sub Item from nested Subfolder
      const names = body.data.results.map((r) => r.name);
      assert.deepEqual(names, ['Get Users', 'Create User', 'Sub Item']);
    });

    it('executes selected requests by ID in deterministic order', async () => {
      // Pass in reverse order, runner must sort deterministically
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [reqRefreshToken.id, reqLogin.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.total, 2);
      assert.equal(body.data.summary.passed, 2);

      const names = body.data.results.map((r) => r.name);
      assert.deepEqual(names, ['Login', 'Refresh Token']);
    });

    it('deduplicates requests when selected both via folder and requestIds', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          folderIds: [folderAuthId],
          requestIds: [reqLogin.id, reqRootHealth.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      // Login is in folderAuthId and also in requestIds, should only run ONCE
      assert.equal(body.data.summary.total, 3);
      const names = body.data.results.map((r) => r.name);
      assert.deepEqual(names, ['Login', 'Refresh Token', 'Health Check']);
    });

    it('handles empty collection gracefully without errors', async () => {
      const emptyColl = await createCollection(memberToken, workspaceId, 'Empty Coll');

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${emptyColl.id}/run`, {
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
      assert.equal(body.data.summary.total, 0);
      assert.equal(body.data.summary.completed, 0);
      assert.equal(body.data.summary.passed, 0);
      assert.equal(body.data.summary.failed, 0);
      assert.equal(body.data.summary.skipped, 0);
      assert.equal(body.data.summary.status, 'COMPLETED');
      assert.deepEqual(body.data.results, []);
    });
  });

  describe('2. Sequential Execution & Timing', () => {
    it('executes requests strictly sequentially', async () => {
      executionLog.length = 0;

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [reqLogin.id, reqRefreshToken.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      assert.equal(executionLog.length, 2);
      assert.equal(executionLog[0].path, '/api/login');
      assert.equal(executionLog[1].path, '/api/refresh');
      assert.ok(executionLog[1].time >= executionLog[0].time);
    });
  });

  describe('3. Stop-on-Error Behavior', () => {
    let collStopTest;
    let reqOk1, reqFail, reqOk2;

    before(async () => {
      collStopTest = await createCollection(memberToken, workspaceId, 'Stop On Error Test');

      reqOk1 = await createRequest(memberToken, workspaceId, collStopTest.id, {
        name: 'Step 1 OK',
        method: 'GET',
        url: `${mockServerUrl}/api/login`,
      });
      await prisma.request.update({ where: { id: reqOk1.id }, data: { position: 0 } });

      reqFail = await createRequest(memberToken, workspaceId, collStopTest.id, {
        name: 'Step 2 Fail',
        method: 'GET',
        url: `${mockServerUrl}/api/error-400`,
      });
      await prisma.request.update({ where: { id: reqFail.id }, data: { position: 1 } });

      reqOk2 = await createRequest(memberToken, workspaceId, collStopTest.id, {
        name: 'Step 3 OK',
        method: 'GET',
        url: `${mockServerUrl}/api/refresh`,
      });
      await prisma.request.update({ where: { id: reqOk2.id }, data: { position: 2 } });
    });

    it('halts and marks remaining requests as skipped when stopOnError is true', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collStopTest.id}/run`, {
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
      const summary = body.data.summary;

      assert.equal(summary.total, 3);
      assert.equal(summary.completed, 2);
      assert.equal(summary.passed, 1);
      assert.equal(summary.failed, 1);
      assert.equal(summary.skipped, 1);
      assert.equal(summary.stopped, true);
      assert.equal(summary.status, 'STOPPED');

      const results = body.data.results;
      assert.equal(results[0].name, 'Step 1 OK');
      assert.equal(results[0].success, true);
      assert.equal(results[0].skipped, false);

      assert.equal(results[1].name, 'Step 2 Fail');
      assert.equal(results[1].success, false);
      assert.equal(results[1].status, 400);
      assert.equal(results[1].skipped, false);

      assert.equal(results[2].name, 'Step 3 OK');
      assert.equal(results[2].success, false);
      assert.equal(results[2].skipped, true);
      assert.equal(results[2].status, null);
    });

    it('continues executing subsequent requests when stopOnError is false', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collStopTest.id}/run`, {
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
      const summary = body.data.summary;

      assert.equal(summary.total, 3);
      assert.equal(summary.completed, 3);
      assert.equal(summary.passed, 2);
      assert.equal(summary.failed, 1);
      assert.equal(summary.skipped, 0);
      assert.equal(summary.stopped, false);
      assert.equal(summary.status, 'FAILED');

      const results = body.data.results;
      assert.equal(results[0].success, true);
      assert.equal(results[1].success, false);
      assert.equal(results[2].success, true);
    });
  });

  describe('4. Environment & Runtime Variables', () => {
    let collEnvTest;
    let reqEcho;

    before(async () => {
      collEnvTest = await createCollection(memberToken, workspaceId, 'Env Test Collection');

      reqEcho = await createRequest(memberToken, workspaceId, collEnvTest.id, {
        name: 'Echo Env',
        method: 'GET',
        url: '{{baseUrl}}/api/login?env={{envName}}',
      });
    });

    it('resolves active environment variables by default', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collEnvTest.id}/run`, {
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
      assert.equal(body.data.summary.passed, 1);
      assert.equal(body.data.metadata.environmentId, activeEnv.id);
      assert.equal(body.data.metadata.environmentName, 'Staging');
      assert.ok(body.data.results[0].url.includes('env=StagingEnv'));
    });

    it('resolves explicitly specified environmentId', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collEnvTest.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          environmentId: customEnv.id,
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.metadata.environmentId, customEnv.id);
      assert.equal(body.data.metadata.environmentName, 'Production');
      assert.ok(body.data.results[0].url.includes('env=ProductionEnv'));
    });

    it('allows runtime variables to override environment variables without persistence', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collEnvTest.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          runtimeVariables: {
            envName: 'OverrideRuntimeEnv',
          },
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.data.results[0].url.includes('env=OverrideRuntimeEnv'));

      // Verify the database environment variable was NOT changed
      const dbEnv = await prisma.environmentVariable.findFirst({
        where: { environmentId: activeEnv.id, key: 'envName' },
      });
      assert.equal(dbEnv.value, 'StagingEnv');
    });
  });

  describe('5. Security, Authorization & Workspace Isolation', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 401);
    });

    it('rejects VIEWER role with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 403);
    });

    it('rejects collection from a different workspace with 404', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${otherCollectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 404);
    });

    it('rejects invalid or foreign folder IDs with 404', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          folderIds: ['00000000-0000-0000-0000-000000000000'],
        }),
      });
      assert.equal(res.status, 404);
    });

    it('rejects invalid or foreign request IDs with 404', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: ['00000000-0000-0000-0000-000000000000'],
        }),
      });
      assert.equal(res.status, 404);
    });

    it('rejects environment from a different workspace with 404', async () => {
      // Create env in foreign workspace
      const strangerEnvRes = await fetch(`${baseUrl}/workspaces/${otherWorkspaceId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({ name: 'ForeignEnv' }),
      });
      const foreignEnv = (await strangerEnvRes.json()).data.environment;

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          environmentId: foreignEnv.id,
        }),
      });
      assert.equal(res.status, 404);
    });

    it('rejects SSRF local targets by default when allowLocalTargets is false', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [reqLogin.id],
          _allowLocalTargets: false,
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.summary.failed, 1);
      assert.equal(body.data.results[0].success, false);
      assert.equal(body.data.results[0].error.type, 'SECURITY');
    });
  });

  describe('6. History Integration', () => {
    it('creates execution history entries without duplicates', async () => {
      const initialCount = await prisma.requestExecution.count({
        where: { requestId: reqLogin.id },
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [reqLogin.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);

      const afterCount = await prisma.requestExecution.count({
        where: { requestId: reqLogin.id },
      });

      assert.equal(afterCount, initialCount + 1);
    });
  });

  describe('7. Secrets Redaction & Safe Metadata', () => {
    it('does not expose secret values in runner results', async () => {
      const secretReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Secret Header Request',
        method: 'GET',
        url: `${mockServerUrl}/api/login`,
        headers: [{ key: 'X-Api-Key', value: '{{secretKey}}', isEnabled: true }],
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          requestIds: [secretReq.id],
          _allowLocalTargets: true,
        }),
      });

      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(!text.includes('SUPER_SECRET_VALUE'), 'Secret value must not be exposed in runner response');
    });
  });
});
