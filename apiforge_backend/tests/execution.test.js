import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('API Request Execution Engine Integration Tests', () => {
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
  let otherCollectionId;

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

  before(async () => {
    // 1. Start ephemeral Mock Target HTTP Server
    mockServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

      if (parsedUrl.pathname === '/api/echo') {
        let bodyChunks = [];
        req.on('data', (chunk) => bodyChunks.push(chunk));
        req.on('end', () => {
          const rawBody = Buffer.concat(bodyChunks).toString('utf-8');
          let parsedJson = null;
          try {
            parsedJson = JSON.parse(rawBody);
          } catch {
            parsedJson = null;
          }

          const queryObj = {};
          parsedUrl.searchParams.forEach((val, key) => {
            queryObj[key] = val;
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              method: req.method,
              url: req.url,
              headers: req.headers,
              query: queryObj,
              bodyRaw: rawBody,
              bodyJson: parsedJson,
            })
          );
        });
        return;
      }

      if (parsedUrl.pathname === '/api/text') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello from plain text');
        return;
      }

      if (parsedUrl.pathname === '/api/slow') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ delayed: true }));
        }, 500);
        return;
      }

      if (parsedUrl.pathname === '/api/not-found') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Remote item not found' }));
        return;
      }

      if (parsedUrl.pathname === '/api/redirect-safe') {
        res.writeHead(302, { Location: '/api/echo' });
        res.end();
        return;
      }

      if (parsedUrl.pathname === '/api/redirect-loop') {
        res.writeHead(302, { Location: '/api/redirect-loop' });
        res.end();
        return;
      }

      if (parsedUrl.pathname === '/api/redirect-ssrf') {
        res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data' });
        res.end();
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
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

    // 3. Set up users and workspaces
    const ownerData = await registerUser(`exec-owner-${Date.now()}@example.com`, 'Exec Owner');
    ownerUser = ownerData.user;
    ownerToken = ownerData.token;

    const memberData = await registerUser(`exec-member-${Date.now()}@example.com`, 'Exec Member');
    memberUser = memberData.user;
    memberToken = memberData.token;

    const viewerData = await registerUser(`exec-viewer-${Date.now()}@example.com`, 'Exec Viewer');
    viewerUser = viewerData.user;
    viewerToken = viewerData.token;

    const strangerData = await registerUser(`exec-stranger-${Date.now()}@example.com`, 'Exec Stranger');
    strangerUser = strangerData.user;
    strangerToken = strangerData.token;

    const ws = await createWorkspace(ownerToken, `Exec Test WS ${Date.now()}`);
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

    const coll = await createCollection(ownerToken, workspaceId, 'Execution Test Collection');
    collectionId = coll.id;

    // Separate workspace for cross-tenant testing
    const otherWs = await createWorkspace(strangerToken, `Stranger WS ${Date.now()}`);
    otherWorkspaceId = otherWs.id;
    const otherColl = await createCollection(strangerToken, otherWorkspaceId, 'Stranger Collection');
    otherCollectionId = otherColl.id;
  });

  after(async () => {
    if (mockServer) {
      await new Promise((resolve) => mockServer.close(resolve));
    }
    if (appServer) {
      await new Promise((resolve) => appServer.close(resolve));
    }

    try {
      await prisma.request.deleteMany({
        where: {
          collection: {
            workspace: {
              name: { startsWith: 'Exec Test WS' },
            },
          },
        },
      });
      await prisma.workspace.deleteMany({
        where: { name: { startsWith: 'Exec Test WS' } },
      });
      await prisma.workspace.deleteMany({
        where: { name: { startsWith: 'Stranger WS' } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'exec-' } },
      });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('Basic HTTP Request Execution', () => {
    it('should execute a GET request and normalize the response', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Simple Echo GET',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
        queryParams: [
          { key: 'category', value: 'books', enabled: true },
          { key: 'unused', value: 'foo', enabled: false },
        ],
        headers: [
          { key: 'X-Client-Id', value: 'APIForge-Test', enabled: true },
          { key: 'X-Disabled-Header', value: 'ignore-me', enabled: false },
        ],
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(body.data.request.name, 'Simple Echo GET');
      assert.equal(body.data.request.method, 'GET');

      // Verify normalized response structure
      const response = body.data.response;
      assert.equal(response.status, 200);
      assert.equal(response.statusText, 'OK');
      assert.equal(typeof response.timeMs, 'number');
      assert.equal(response.timeMs >= 0, true);
      assert.equal(typeof response.sizeBytes, 'number');
      assert.equal(response.redirected, false);

      // Verify echo results from mock target
      assert.equal(response.body.method, 'GET');
      assert.equal(response.body.query.category, 'books');
      assert.equal(response.body.query.unused, undefined);
      assert.equal(response.body.headers['x-client-id'], 'APIForge-Test');
      assert.equal(response.body.headers['x-disabled-header'], undefined);
    });

    it('should execute a POST request with JSON body', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Create Item POST',
        method: 'POST',
        url: `${mockServerUrl}/api/echo`,
        body: {
          mode: 'json',
          raw: JSON.stringify({ item: 'Widget', count: 42 }),
        },
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(body.data.response.status, 200);
      assert.equal(body.data.response.body.method, 'POST');
      assert.equal(body.data.response.body.bodyJson.item, 'Widget');
      assert.equal(body.data.response.body.bodyJson.count, 42);
      assert.ok(body.data.response.headers['content-type'].includes('application/json'));
    });

    it('should execute PUT, PATCH, and DELETE requests', async () => {
      for (const verb of ['PUT', 'PATCH', 'DELETE']) {
        const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
          name: `${verb} Test`,
          method: verb,
          url: `${mockServerUrl}/api/echo`,
          body: verb !== 'DELETE' ? { mode: 'json', raw: JSON.stringify({ action: verb }) } : undefined,
        });

        const res = await fetch(
          `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
        assert.equal(body.data.response.status, 200);
        assert.equal(body.data.response.body.method, verb);
      }
    });

    it('should normalize plain text response correctly', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Get Plain Text',
        method: 'GET',
        url: `${mockServerUrl}/api/text`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(body.data.response.status, 200);
      assert.equal(body.data.response.body, 'Hello from plain text');
      assert.ok(body.data.response.contentType.includes('text/plain'));
    });
  });

  describe('Variable Resolution', () => {
    it('should resolve variables across URL, headers, query params, and body', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Parameterized Request',
        method: 'POST',
        url: '{{targetUrl}}/api/echo',
        queryParams: [
          { key: 'filter', value: '{{filterVal}}', enabled: true },
        ],
        headers: [
          { key: 'X-App-Env', value: '{{environment}}', enabled: true },
        ],
        body: {
          mode: 'json',
          raw: JSON.stringify({ user: '{{userName}}', role: '{{userRole}}' }),
        },
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            variables: {
              targetUrl: mockServerUrl,
              filterVal: 'active-users',
              environment: 'staging',
              userName: 'Dulaj',
              userRole: 'Administrator',
            },
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.response.body.query.filter, 'active-users');
      assert.equal(body.data.response.body.headers['x-app-env'], 'staging');
      assert.equal(body.data.response.body.bodyJson.user, 'Dulaj');
      assert.equal(body.data.response.body.bodyJson.role, 'Administrator');
    });

    it('should reject with 400 when a required variable is missing', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Missing Var Request',
        method: 'GET',
        url: '{{unresolvedBaseUrl}}/api/echo',
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            variables: { otherKey: 'not-the-right-key' },
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('Missing required variable: {{unresolvedBaseUrl}}'));
    });
  });

  describe('Authentication Transformation', () => {
    it('should format Bearer token authentication header', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Bearer Auth Request',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
        auth: {
          type: 'bearer',
          bearer: { token: 'my-super-secret-token' },
        },
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(body.data.response.body.headers['authorization'], 'Bearer my-super-secret-token');
    });

    it('should format Basic authentication credentials into Base64 header', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Basic Auth Request',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
        auth: {
          type: 'basic',
          basic: { username: 'forge_user', password: 'forge_password' },
        },
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      const expectedBase64 = Buffer.from('forge_user:forge_password').toString('base64');
      assert.equal(body.data.response.body.headers['authorization'], `Basic ${expectedBase64}`);
    });

    it('should inject API key into header or query parameters', async () => {
      // In header
      const headerReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'API Key in Header',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
        auth: {
          type: 'api-key',
          apiKey: { key: 'X-API-Key', value: 'my-api-key-123', addTo: 'header' },
        },
      });

      const headerRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${headerReq.id}/execute`,
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

      const headerBody = await headerRes.json();
      assert.equal(headerRes.status, 200);
      assert.equal(headerBody.data.response.body.headers['x-api-key'], 'my-api-key-123');

      // In query parameter
      const queryReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'API Key in Query',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
        auth: {
          type: 'api-key',
          apiKey: { key: 'api_key', value: 'query-token-456', addTo: 'query' },
        },
      });

      const queryRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${queryReq.id}/execute`,
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

      const queryBody = await queryRes.json();
      assert.equal(queryRes.status, 200);
      assert.equal(queryBody.data.response.body.query['api_key'], 'query-token-456');
    });
  });

  describe('SSRF Protection & Target Validation', () => {
    it('should block localhost and loopback targets by default (SSRF)', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'SSRF Loopback Attack',
        method: 'GET',
        url: 'http://127.0.0.1:8080/internal-status',
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({}), // _allowLocalTargets not sent -> default false
        }
      );

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('restricted by SSRF protection'));
    });

    it('should block cloud metadata endpoint 169.254.169.254', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'AWS Cloud Metadata Attack',
        method: 'GET',
        url: 'http://169.254.169.254/latest/meta-data/',
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('restricted by SSRF protection'));
    });

    it('should block private RFC 1918 subnets (10.x, 192.168.x)', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'RFC 1918 Attack',
        method: 'GET',
        url: 'http://192.168.1.1/admin',
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('restricted by SSRF protection'));
    });

    it('should reject non-HTTP protocols with 400', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'FTP Protocol Request',
        method: 'GET',
        url: 'ftp://ftp.example.com/files',
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({}),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message.includes("Only 'http:' and 'https:' are allowed"));
    });
  });

  describe('Redirects and Error Handling', () => {
    it('should safely follow 3xx redirects to authorized targets', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Safe Redirect Test',
        method: 'GET',
        url: `${mockServerUrl}/api/redirect-safe`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(body.data.response.status, 200);
      assert.equal(body.data.response.redirected, true);
      assert.ok(body.data.response.url.includes('/api/echo'));
    });

    it('should intercept and block redirect to a restricted destination (SSRF via Redirect)', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'SSRF via Redirect Test',
        method: 'GET',
        url: `${mockServerUrl}/api/redirect-ssrf`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            _allowLocalTargets: true, // Mock server is local, but redirect points to 169.254.169.254
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('restricted by SSRF protection'));
    });

    it('should detect and prevent infinite redirect loops', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Infinite Redirect Loop',
        method: 'GET',
        url: `${mockServerUrl}/api/redirect-loop`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(res.status, 508);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('Exceeded maximum limit'));
    });

    it('should enforce execution timeout settings', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Timeout Test',
        method: 'GET',
        url: `${mockServerUrl}/api/slow`,
        settings: {
          timeout: 150, // Mock server delays 500ms -> should trigger timeout
        },
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(res.status, 504);
      assert.equal(body.success, false);
      assert.ok(body.message.includes('timed out'));
    });

    it('should return remote 404 cleanly as response data without server crash', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Remote 404 Test',
        method: 'GET',
        url: `${mockServerUrl}/api/not-found`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
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
      assert.equal(res.status, 200); // APIForge itself succeeded in executing the call
      assert.equal(body.data.response.status, 404);
      assert.equal(body.data.response.body.error, 'Remote item not found');
    });
  });

  describe('Authorization & Multi-Tenant Scoping', () => {
    it('should reject VIEWER from executing requests with 403', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Viewer Execute Attempt',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${viewerToken}`,
          },
          body: JSON.stringify({
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should reject non-member stranger from executing request with 403', async () => {
      const savedReq = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Stranger Execute Attempt',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedReq.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${strangerToken}`,
          },
          body: JSON.stringify({
            _allowLocalTargets: true,
          }),
        }
      );

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should return 404 if request does not belong to the collection', async () => {
      const savedInOther = await createRequest(strangerToken, otherWorkspaceId, otherCollectionId, {
        name: 'Cross Tenant Request',
        method: 'GET',
        url: `${mockServerUrl}/api/echo`,
      });

      // Try accessing request from otherCollectionId inside workspaceId / collectionId
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${savedInOther.id}/execute`,
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
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });

    it('should not mutate saved request record in database after execution', async () => {
      const original = await createRequest(memberToken, workspaceId, collectionId, {
        name: 'Immutability Verification',
        method: 'GET',
        url: '{{baseUrl}}/api/echo',
        queryParams: [{ key: 'v', value: '1', enabled: true }],
      });

      await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/requests/${original.id}/execute`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${memberToken}`,
          },
          body: JSON.stringify({
            variables: { baseUrl: mockServerUrl },
            _allowLocalTargets: true,
          }),
        }
      );

      const checkInDb = await prisma.request.findUnique({
        where: { id: original.id },
      });

      assert.equal(checkInDb.url, '{{baseUrl}}/api/echo');
      assert.equal(checkInDb.name, 'Immutability Verification');
    });
  });
});
