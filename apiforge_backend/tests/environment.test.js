import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';
import { MASKED_SECRET_VALUE } from '../src/services/environments/variable.service.js';

describe('Environment & Variable Management Integration Tests', () => {
  let appServer;
  let baseUrl;

  let mockServer;
  let mockServerPort;
  let mockServerUrl;

  // Workspace users
  let ownerUser;
  let ownerToken;

  let adminUser;
  let adminToken;

  let memberUser;
  let memberToken;

  let viewerUser;
  let viewerToken;

  let strangerUser;
  let strangerToken;

  let workspaceAId;
  let workspaceBId;

  let collectionAId;

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
    assert.equal(res.status, 201, `Request creation failed: ${JSON.stringify(body)}`);
    return body.data.request;
  }

  before(async () => {
    // 1. Start ephemeral Mock Target HTTP Server
    mockServer = http.createServer((req, res) => {
      let bodyChunks = [];
      req.on('data', (chunk) => bodyChunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(bodyChunks).toString('utf-8');
        let bodyJson = null;
        try {
          bodyJson = JSON.parse(rawBody);
        } catch {
          bodyJson = null;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            method: req.method,
            url: req.url,
            headers: req.headers,
            bodyRaw: rawBody,
            bodyJson,
          })
        );
      });
    });

    await new Promise((resolve) => {
      mockServer.listen(0, '127.0.0.1', () => {
        mockServerPort = mockServer.address().port;
        mockServerUrl = `http://127.0.0.1:${mockServerPort}`;
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

    // 3. Register users
    const now = Date.now();
    const ownerData = await registerUser(`env-owner-${now}@example.com`, 'Env Owner');
    ownerUser = ownerData.user;
    ownerToken = ownerData.token;

    const adminData = await registerUser(`env-admin-${now}@example.com`, 'Env Admin');
    adminUser = adminData.user;
    adminToken = adminData.token;

    const memberData = await registerUser(`env-member-${now}@example.com`, 'Env Member');
    memberUser = memberData.user;
    memberToken = memberData.token;

    const viewerData = await registerUser(`env-viewer-${now}@example.com`, 'Env Viewer');
    viewerUser = viewerData.user;
    viewerToken = viewerData.token;

    const strangerData = await registerUser(`env-stranger-${now}@example.com`, 'Env Stranger');
    strangerUser = strangerData.user;
    strangerToken = strangerData.token;

    // 4. Create Workspace A
    const wsA = await createWorkspace(ownerToken, `Env WS A ${now}`);
    workspaceAId = wsA.id;

    // Add members to Workspace A
    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId: workspaceAId, userId: adminUser.id, role: WORKSPACE_ROLES.ADMIN },
        { workspaceId: workspaceAId, userId: memberUser.id, role: WORKSPACE_ROLES.MEMBER },
        { workspaceId: workspaceAId, userId: viewerUser.id, role: WORKSPACE_ROLES.VIEWER },
      ],
    });

    // Create Workspace B (for stranger)
    const wsB = await createWorkspace(strangerToken, `Env WS B ${now}`);
    workspaceBId = wsB.id;

    // Create collection in Workspace A
    const collA = await createCollection(ownerToken, workspaceAId, 'Env Exec Collection');
    collectionAId = collA.id;
  });

  after(async () => {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
    }
    if (appServer) {
      await new Promise((resolve) => appServer.close(resolve));
    }

    try {
      await prisma.workspace.deleteMany({
        where: { name: { startsWith: 'Env WS' } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'env-' } },
      });
    } catch {
      // Ignore cleanup error
    }
  });

  // ==========================================
  // ENVIRONMENT CRUD & AUTHORIZATION
  // ==========================================
  describe('Environment CRUD & Authorization', () => {
    let createdEnvId;

    it('should allow OWNER to create an environment', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'Development',
          description: 'Development environment for APIForge',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.environment.name, 'Development');
      assert.equal(body.data.environment.description, 'Development environment for APIForge');
      assert.equal(body.data.environment.isActive, false);
      assert.equal(body.data.environment.variableCount, 0);

      createdEnvId = body.data.environment.id;
    });

    it('should allow ADMIN to create an environment', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Staging',
          description: 'Staging server environment',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.environment.name, 'Staging');
    });

    it('should reject MEMBER from creating an environment with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Member Env',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should reject VIEWER from creating an environment with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({
          name: 'Viewer Env',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should reject duplicate environment name in the same workspace with 409', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'Development', // Already exists in Workspace A
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 409);
      assert.equal(body.success, false);
    });

    it('should allow duplicate environment name in a DIFFERENT workspace', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceBId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({
          name: 'Development', // Exists in Workspace A, but this is Workspace B
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.environment.name, 'Development');
    });

    it('should validate environment name constraints (required, max length)', async () => {
      // Empty name
      const resEmpty = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: '   ' }),
      });
      assert.equal(resEmpty.status, 400);

      // Oversized name (>100 chars)
      const resLong = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: 'A'.repeat(101) }),
      });
      assert.equal(resLong.status, 400);
    });

    it('should allow MEMBER and VIEWER to list environments', async () => {
      for (const token of [memberToken, viewerToken]) {
        const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.ok(Array.isArray(body.data.environments));
        assert.ok(body.data.environments.length >= 2);
      }
    });

    it('should allow VIEWER to get environment by ID', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${createdEnvId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.environment.id, createdEnvId);
      assert.equal(body.data.environment.name, 'Development');
      assert.ok(Array.isArray(body.data.environment.variables));
    });

    it('should reject stranger from accessing environments in Workspace A with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${strangerToken}` },
      });

      assert.equal(res.status, 403);
    });

    it('should return 404 for environment in another workspace (cross-tenant)', async () => {
      // createdEnvId is in Workspace A, stranger is in Workspace B
      const res = await fetch(`${baseUrl}/workspaces/${workspaceBId}/environments/${createdEnvId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${strangerToken}` },
      });

      assert.equal(res.status, 404);
    });

    it('should allow ADMIN to update environment metadata', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${createdEnvId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Development Updated',
          description: 'Updated description',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.environment.name, 'Development Updated');
      assert.equal(body.data.environment.description, 'Updated description');
    });

    it('should reject MEMBER from updating environment with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${createdEnvId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ name: 'Hacked Env' }),
      });

      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // ENVIRONMENT ACTIVATION
  // ==========================================
  describe('Environment Activation', () => {
    let env1Id;
    let env2Id;

    before(async () => {
      const res1 = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: 'Active Test 1' }),
      });
      const body1 = await res1.json();
      env1Id = body1.data.environment.id;

      const res2 = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: 'Active Test 2' }),
      });
      const body2 = await res2.json();
      env2Id = body2.data.environment.id;
    });

    it('should allow ADMIN to activate an environment', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${env1Id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.environment.isActive, true);
    });

    it('should deactivate all other environments when activating another (single active environment)', async () => {
      // Activate env2
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${env2Id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.environment.isActive, true);

      // Verify env1 is now inactive
      const checkEnv1 = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${env1Id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const bodyEnv1 = await checkEnv1.json();
      assert.equal(bodyEnv1.data.environment.isActive, false);
    });

    it('should reject MEMBER from activating environment with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${env1Id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      assert.equal(res.status, 403);
    });

    it('should leave no active environment if the active environment is deleted', async () => {
      // env2 is currently active. Delete it.
      const resDel = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${env2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(resDel.status, 200);

      // Verify no environment is active in Workspace A
      const listRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      const listBody = await listRes.json();
      const anyActive = listBody.data.environments.some((e) => e.isActive);
      assert.equal(anyActive, false);
    });
  });

  // ==========================================
  // ENVIRONMENT VARIABLES & SECRET MASKING
  // ==========================================
  describe('Environment Variables & Secret Masking', () => {
    let targetEnvId;
    let plainVarId;
    let secretVarId;

    before(async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: 'Variables Test Env' }),
      });
      const body = await res.json();
      targetEnvId = body.data.environment.id;
    });

    it('should allow ADMIN to create a plain variable', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          key: 'baseUrl',
          value: 'https://api.example.com',
          isSecret: false,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.variable.key, 'baseUrl');
      assert.equal(body.data.variable.value, 'https://api.example.com');
      assert.equal(body.data.variable.isSecret, false);

      plainVarId = body.data.variable.id;
    });

    it('should allow ADMIN to create a secret variable and mask value in response', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          key: 'apiKey',
          value: 'super-secret-api-key-12345',
          isSecret: true,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.variable.key, 'apiKey');
      assert.equal(body.data.variable.isSecret, true);
      // Secret value MUST be masked in API response
      assert.equal(body.data.variable.value, MASKED_SECRET_VALUE);

      secretVarId = body.data.variable.id;
    });

    it('should validate variable key format and reject invalid names with 400', async () => {
      const invalidKeys = ['123startWithNumber', 'has-dash', 'has space', 'has.dot', ''];
      for (const invalidKey of invalidKeys) {
        const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            key: invalidKey,
            value: 'test',
          }),
        });
        assert.equal(res.status, 400, `Key '${invalidKey}' should have been rejected with 400`);
      }
    });

    it('should allow valid variable key formats (camelCase, snake_case, PascalCase, SCREAMING_SNAKE)', async () => {
      const validKeys = ['camelCaseVar', 'snake_case_var', 'PascalCaseVar', 'API_KEY_AUTH', '_hiddenKey'];
      for (const validKey of validKeys) {
        const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            key: validKey,
            value: 'valid-value',
          }),
        });
        assert.equal(res.status, 201, `Key '${validKey}' should have succeeded`);
      }
    });

    it('should reject duplicate variable key in same environment with 409', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          key: 'baseUrl', // Already exists in targetEnvId
          value: 'https://other.com',
        }),
      });

      assert.equal(res.status, 409);
    });

    it('should reject MEMBER and VIEWER from creating variables with 403', async () => {
      for (const token of [memberToken, viewerToken]) {
        const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: 'unauthorizedKey',
            value: 'val',
          }),
        });
        assert.equal(res.status, 403);
      }
    });

    it('should list variables with secret values masked for VIEWER and MEMBER', async () => {
      for (const token of [viewerToken, memberToken]) {
        const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const body = await res.json();
        assert.equal(res.status, 200);
        const secretVar = body.data.variables.find((v) => v.key === 'apiKey');
        assert.ok(secretVar);
        assert.equal(secretVar.isSecret, true);
        assert.equal(secretVar.value, MASKED_SECRET_VALUE);

        const plainVar = body.data.variables.find((v) => v.key === 'baseUrl');
        assert.ok(plainVar);
        assert.equal(plainVar.isSecret, false);
        assert.equal(plainVar.value, 'https://api.example.com');
      }
    });

    it('should retrieve single secret variable with masked value', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables/${secretVarId}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${viewerToken}` },
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.variable.key, 'apiKey');
      assert.equal(body.data.variable.value, MASKED_SECRET_VALUE);
    });

    it('should allow ADMIN to update a variable', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables/${plainVarId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            value: 'https://updated-api.example.com',
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.variable.value, 'https://updated-api.example.com');
    });

    it('should allow ADMIN to delete a variable', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables/${plainVarId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );

      assert.equal(res.status, 200);

      // Verify deletion
      const checkRes = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/environments/${targetEnvId}/variables/${plainVarId}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${viewerToken}` },
        }
      );
      assert.equal(checkRes.status, 404);
    });
  });

  // ==========================================
  // REQUEST EXECUTION WITH ACTIVE ENVIRONMENT
  // ==========================================
  describe('Execution Engine Integration With Environments', () => {
    let executionEnvId;
    let testRequestId;

    before(async () => {
      // 1. Create and activate a dedicated environment in Workspace A
      const envRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: 'Active Execution Environment' }),
      });
      const envBody = await envRes.json();
      executionEnvId = envBody.data.environment.id;

      // Add baseUrl (mock server), apiKey (secret), and stage (plain)
      await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${executionEnvId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          key: 'baseUrl',
          value: mockServerUrl,
          isSecret: false,
        }),
      });

      await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${executionEnvId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          key: 'apiKey',
          value: 'secret-environment-token-777',
          isSecret: true,
        }),
      });

      await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${executionEnvId}/variables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          key: 'stage',
          value: 'production',
          isSecret: false,
        }),
      });

      // Activate this environment
      await fetch(`${baseUrl}/workspaces/${workspaceAId}/environments/${executionEnvId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      // 2. Create a request definition referencing active environment variables
      testRequestId = (
        await createRequest(memberToken, workspaceAId, collectionAId, {
          name: 'Env Parameterized Request',
          method: 'POST',
          url: '{{baseUrl}}/api/echo',
          headers: [
            { key: 'X-API-Key', value: '{{apiKey}}', enabled: true },
            { key: 'X-App-Stage', value: '{{stage}}', enabled: true },
          ],
          body: {
            mode: 'json',
            raw: JSON.stringify({ envStage: '{{stage}}' }),
          },
        })
      ).id;
    });

    it('should resolve variables from the active environment during execution', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${testRequestId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);

      // Verify that mock server received the unmasked secret and plain environment variables
      const response = body.data.response;
      assert.equal(response.status, 200);
      const echoedHeaders = response.body.headers;
      assert.equal(echoedHeaders['x-api-key'], 'secret-environment-token-777');
      assert.equal(echoedHeaders['x-app-stage'], 'production');
      assert.equal(response.body.bodyJson.envStage, 'production');

      // Verify that the secret variable is NOT exposed in the returned request summary
      assert.equal(body.data.request.headers, undefined);
      assert.equal(JSON.stringify(body.data.request).includes('secret-environment-token-777'), false);
    });

    it('should enforce precedence: runtime variables override active environment variables', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${testRequestId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            variables: {
              stage: 'overridden-staging', // Override environment variable 'stage'
            },
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      const echoedHeaders = body.data.response.body.headers;
      // Overridden variable takes precedence
      assert.equal(echoedHeaders['x-app-stage'], 'overridden-staging');
      assert.equal(body.data.response.body.bodyJson.envStage, 'overridden-staging');

      // Non-overridden variables still resolve from the active environment
      assert.equal(echoedHeaders['x-api-key'], 'secret-environment-token-777');
    });

    it('should execute successfully with runtime variables when no environment is active', async () => {
      // Deactivate environment
      await prisma.environment.updateMany({
        where: { workspaceId: workspaceAId },
        data: { isActive: false },
      });

      // Provide all required variables at runtime
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${testRequestId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            variables: {
              baseUrl: mockServerUrl,
              apiKey: 'runtime-only-key',
              stage: 'runtime-stage',
            },
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.response.body.headers['x-api-key'], 'runtime-only-key');
    });

    it('should reject with 400 when variable is missing and no active environment supplies it', async () => {
      // No active environment and runtime variables don't supply {{apiKey}} or {{stage}}
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${testRequestId}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            variables: {
              baseUrl: mockServerUrl,
            },
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('Missing required variable'));
    });
  });
});
