import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';
import { parseCurlCommand } from '../src/services/import-export/curl-import.service.js';
import { exportToCurl } from '../src/services/import-export/curl-export.service.js';

describe('cURL Import & Export Integration Tests', () => {
  let appServer;
  let baseUrl;

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
  let folderId;
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

  async function createFolder(token, wsId, collId, name) {
    const res = await fetch(`${baseUrl}/workspaces/${wsId}/collections/${collId}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
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
    // 1. Start App server
    await new Promise((resolve) => {
      appServer = app.listen(0, () => {
        const port = appServer.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // 2. Register users and workspaces
    const ownerData = await registerUser(`curl-owner-${Date.now()}@example.com`, 'Curl Owner');
    ownerUser = ownerData.user;
    ownerToken = ownerData.token;

    const memberData = await registerUser(`curl-member-${Date.now()}@example.com`, 'Curl Member');
    memberUser = memberData.user;
    memberToken = memberData.token;

    const viewerData = await registerUser(`curl-viewer-${Date.now()}@example.com`, 'Curl Viewer');
    viewerUser = viewerData.user;
    viewerToken = viewerData.token;

    const strangerData = await registerUser(`curl-stranger-${Date.now()}@example.com`, 'Curl Stranger');
    strangerUser = strangerData.user;
    strangerToken = strangerData.token;

    const ws = await createWorkspace(ownerToken, `Curl WS ${Date.now()}`);
    workspaceId = ws.id;

    await addMember(ownerToken, workspaceId, memberUser.id, WORKSPACE_ROLES.MEMBER);
    await addMember(ownerToken, workspaceId, viewerUser.id, WORKSPACE_ROLES.VIEWER);

    const coll = await createCollection(ownerToken, workspaceId, 'Main Collection');
    collectionId = coll.id;

    const folder = await createFolder(ownerToken, workspaceId, collectionId, 'Auth Folder');
    folderId = folder.id;

    // Unrelated workspace for isolation testing
    const otherWs = await createWorkspace(strangerToken, `Other WS ${Date.now()}`);
    otherWorkspaceId = otherWs.id;
    const otherColl = await createCollection(strangerToken, otherWorkspaceId, 'Other Collection');
    otherCollectionId = otherColl.id;
  });

  after(async () => {
    if (appServer) {
      await new Promise((resolve) => appServer.close(resolve));
    }

    try {
      await prisma.request.deleteMany({
        where: { collection: { workspaceId: { in: [workspaceId, otherWorkspaceId] } } },
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
  // PARSER UNIT LOGIC TESTS
  // ==========================================
  describe('cURL Parser Unit Capabilities', () => {
    it('should parse basic GET command', () => {
      const parsed = parseCurlCommand('curl https://api.example.com/users');
      assert.equal(parsed.method, 'GET');
      assert.equal(parsed.url, 'https://api.example.com/users');
      assert.equal(parsed.body.mode, 'none');
      assert.equal(parsed.headers.length, 0);
      assert.equal(parsed.queryParams.length, 0);
    });

    it('should parse POST with JSON body and headers', () => {
      const parsed = parseCurlCommand(
        'curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d \'{"name":"John","age":30}\''
      );
      assert.equal(parsed.method, 'POST');
      assert.equal(parsed.url, 'https://api.example.com/users');
      assert.equal(parsed.body.mode, 'json');
      assert.equal(parsed.body.raw, '{"name":"John","age":30}');
      assert.equal(parsed.headers.length, 1);
      assert.equal(parsed.headers[0].key, 'Content-Type');
      assert.equal(parsed.headers[0].value, 'application/json');
    });

    it('should infer POST method when body data is passed without -X', () => {
      const parsed = parseCurlCommand(
        'curl https://api.example.com/data --data \'{"hello":"world"}\''
      );
      assert.equal(parsed.method, 'POST');
      assert.equal(parsed.body.mode, 'json');
    });

    it('should extract query parameters from URL query string', () => {
      const parsed = parseCurlCommand(
        'curl "https://api.example.com/search?q=nodejs&page=1&limit=25"'
      );
      assert.equal(parsed.url, 'https://api.example.com/search');
      assert.equal(parsed.queryParams.length, 3);
      assert.equal(parsed.queryParams[0].key, 'q');
      assert.equal(parsed.queryParams[0].value, 'nodejs');
      assert.equal(parsed.queryParams[1].key, 'page');
      assert.equal(parsed.queryParams[1].value, '1');
      assert.equal(parsed.queryParams[2].key, 'limit');
      assert.equal(parsed.queryParams[2].value, '25');
    });

    it('should convert data arguments to query parameters when -G is used', () => {
      const parsed = parseCurlCommand(
        'curl -G "https://api.example.com/items" -d "status=active" -d "sort=desc"'
      );
      assert.equal(parsed.method, 'GET');
      assert.equal(parsed.url, 'https://api.example.com/items');
      assert.equal(parsed.queryParams.length, 2);
      assert.equal(parsed.queryParams[0].key, 'status');
      assert.equal(parsed.queryParams[0].value, 'active');
      assert.equal(parsed.queryParams[1].key, 'sort');
      assert.equal(parsed.queryParams[1].value, 'desc');
      assert.equal(parsed.body.mode, 'none');
    });

    it('should map Authorization Bearer header into auth model without duplicating in headers', () => {
      const parsed = parseCurlCommand(
        'curl -H "Authorization: Bearer my-secret-jwt-token" https://api.example.com/me'
      );
      assert.equal(parsed.auth.type, 'bearer');
      assert.equal(parsed.auth.bearer.token, 'my-secret-jwt-token');
      assert.equal(parsed.headers.length, 0); // Not duplicated
    });

    it('should map -u username:password into basic auth model', () => {
      const parsed = parseCurlCommand(
        'curl -u "adminUser:superPassword" https://api.example.com/admin'
      );
      assert.equal(parsed.auth.type, 'basic');
      assert.equal(parsed.auth.basic.username, 'adminUser');
      assert.equal(parsed.auth.basic.password, 'superPassword');
    });

    it('should map -b cookie into Cookie header', () => {
      const parsed = parseCurlCommand(
        'curl -b "session_id=12345; theme=dark" https://api.example.com/app'
      );
      assert.equal(parsed.headers.length, 1);
      assert.equal(parsed.headers[0].key, 'Cookie');
      assert.equal(parsed.headers[0].value, 'session_id=12345; theme=dark');
    });

    it('should parse --data-urlencode into x-www-form-urlencoded body', () => {
      const parsed = parseCurlCommand(
        'curl -X POST https://api.example.com/form --data-urlencode "user=Alice Smith" --data-urlencode "role=admin"'
      );
      assert.equal(parsed.body.mode, 'x-www-form-urlencoded');
      assert.equal(parsed.body.urlencoded.length, 2);
      assert.equal(parsed.body.urlencoded[0].key, 'user');
      assert.equal(parsed.body.urlencoded[0].value, 'Alice Smith');
    });

    it('should handle multiline backslash line continuations cleanly', () => {
      const command = `curl -X PUT \\\n  -H "Content-Type: application/json" \\\n  -d '{"updated":true}' \\\n  https://api.example.com/items/42`;
      const parsed = parseCurlCommand(command);
      assert.equal(parsed.method, 'PUT');
      assert.equal(parsed.url, 'https://api.example.com/items/42');
      assert.equal(parsed.body.mode, 'json');
      assert.equal(parsed.body.raw, '{"updated":true}');
    });

    it('should preserve unresolved {{variables}} in URL and body', () => {
      const parsed = parseCurlCommand(
        'curl -X POST "{{baseUrl}}/users/{{userId}}" -H "Authorization: Bearer {{token}}" -d \'{"email":"{{userEmail}}"}\''
      );
      assert.equal(parsed.url, '{{baseUrl}}/users/{{userId}}');
      assert.equal(parsed.auth.type, 'bearer');
      assert.equal(parsed.auth.bearer.token, '{{token}}');
      assert.equal(parsed.body.raw, '{"email":"{{userEmail}}"}');
    });

    it('should throw error when command has no URL', () => {
      assert.throws(
        () => parseCurlCommand('curl -X POST -H "Content-Type: application/json"'),
        /No target URL specified/
      );
    });
  });

  // ==========================================
  // PREVIEW ENDPOINT TESTS
  // ==========================================
  describe('POST /workspaces/:workspaceId/import/curl/preview', () => {
    it('should preview normalized request definition without database mutation', async () => {
      const countBefore = await prisma.request.count();

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          curl: 'curl -X POST https://api.example.com/preview -H "Accept: application/json" -d \'{"test":1}\'',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.method, 'POST');
      assert.equal(body.data.url, 'https://api.example.com/preview');
      assert.equal(body.data.body.raw, '{"test":1}');

      const countAfter = await prisma.request.count();
      assert.equal(countBefore, countAfter); // Zero persistence
    });

    it('should reject missing cURL payload with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
    });

    it('should reject oversized cURL commands (>100KB)', async () => {
      const largeCurl = `curl https://api.example.com/large -d "${'a'.repeat(100005)}"`;
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ curl: largeCurl }),
      });

      assert.equal(res.status, 400);
    });
  });

  // ==========================================
  // SAVE IMPORT ENDPOINT TESTS
  // ==========================================
  describe('POST /workspaces/:workspaceId/import/curl', () => {
    it('should import and persist cURL request into collection root', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          collectionId,
          curl: 'curl -X POST https://api.example.com/imported-item -H "Content-Type: application/json" -d \'{"imported":true}\'',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.request.collectionId, collectionId);
      assert.equal(body.data.request.folderId, null);
      assert.equal(body.data.request.method, 'POST');
      assert.equal(body.data.request.url, 'https://api.example.com/imported-item');
      assert.equal(body.data.request.body.mode, 'json');
      assert.ok(body.data.request.id);
    });

    it('should import and persist cURL request into folder with custom name', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          collectionId,
          folderId,
          name: 'Custom Imported Request',
          curl: 'curl https://api.example.com/in-folder',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.request.name, 'Custom Imported Request');
      assert.equal(body.data.request.folderId, folderId);
      assert.equal(body.data.request.collectionId, collectionId);
    });

    it('should reject importing into a collection belonging to another workspace', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          collectionId: otherCollectionId, // From other workspace
          curl: 'curl https://api.example.com/fail',
        }),
      });

      assert.equal(res.status, 404);
    });
  });

  // ==========================================
  // EXPORT ENDPOINT TESTS
  // ==========================================
  describe('GET /workspaces/:workspaceId/requests/:requestId/export/curl', () => {
    let exportableReqId;

    before(async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Exportable Request',
        method: 'POST',
        url: 'https://api.example.com/export-target',
        queryParams: [{ key: 'version', value: '2', enabled: true }],
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        auth: {
          type: 'bearer',
          bearer: { token: 'secret-token-123' },
        },
        body: {
          mode: 'json',
          raw: '{"exported":true}',
        },
      });
      exportableReqId = req.id;
    });

    it('should export saved request into valid cURL command', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${exportableReqId}/export/curl`,
        {
          headers: { Authorization: `Bearer ${viewerToken}` },
        }
      );

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.format, 'curl');
      assert.equal(body.data.hasSecrets, true);

      const cmd = body.data.command;
      assert.ok(cmd.startsWith('curl'));
      assert.ok(cmd.includes("-X POST"));
      assert.ok(cmd.includes("https://api.example.com/export-target?version=2"));
      assert.ok(cmd.includes("-H 'Accept: application/json'"));
      assert.ok(cmd.includes("-H 'Authorization: Bearer secret-token-123'"));
      assert.ok(cmd.includes("--data-raw '{\"exported\":true}'"));
    });

    it('should return 404 when request does not belong to specified workspace', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${otherWorkspaceId}/requests/${exportableReqId}/export/curl`,
        {
          headers: { Authorization: `Bearer ${strangerToken}` },
        }
      );

      assert.equal(res.status, 404);
    });
  });

  // ==========================================
  // ROUND-TRIP FIDELITY TEST
  // ==========================================
  describe('Round-Trip Fidelity (Export -> Import)', () => {
    it('should preserve request semantics through export and re-import', () => {
      const original = {
        name: 'Round-Trip Request',
        method: 'POST',
        url: 'https://api.example.com/webhook',
        queryParams: [
          { key: 'source', value: 'github', enabled: true },
          { key: 'disabled_param', value: 'ignore', enabled: false },
        ],
        headers: [
          { key: 'Accept', value: 'application/json', enabled: true },
          { key: 'X-Webhook-Id', value: 'wh_999', enabled: true },
        ],
        auth: {
          type: 'bearer',
          bearer: { token: '{{envToken}}' },
        },
        body: {
          mode: 'json',
          raw: '{"action":"opened","issue":{"id":100}}',
        },
      };

      // 1. Export to cURL
      const exported = exportToCurl(original);
      assert.ok(exported.command);

      // 2. Import back
      const imported = parseCurlCommand(exported.command);

      // 3. Verify semantic equivalence
      assert.equal(imported.method, original.method);
      assert.equal(imported.url, original.url);
      assert.equal(imported.queryParams.length, 1);
      assert.equal(imported.queryParams[0].key, 'source');
      assert.equal(imported.queryParams[0].value, 'github');
      assert.equal(imported.auth.type, 'bearer');
      assert.equal(imported.auth.bearer.token, '{{envToken}}');
      assert.equal(imported.body.mode, 'json');
      assert.equal(imported.body.raw, original.body.raw);
      assert.ok(imported.headers.some((h) => h.key === 'X-Webhook-Id' && h.value === 'wh_999'));
    });
  });

  // ==========================================
  // PERMISSIONS & WORKSPACE ISOLATION
  // ==========================================
  describe('Permissions & Authorization Guard', () => {
    it('should reject unauthenticated import preview with 401', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curl: 'curl https://api.example.com' }),
      });
      assert.equal(res.status, 401);
    });

    it('should reject stranger from importing into workspace with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({
          collectionId,
          curl: 'curl https://api.example.com',
        }),
      });
      assert.equal(res.status, 403);
    });

    it('should prevent VIEWER from importing (mutating) with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/curl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({
          collectionId,
          curl: 'curl https://api.example.com',
        }),
      });
      assert.equal(res.status, 403);
    });

    it('should allow VIEWER to export request with 200', async () => {
      const req = await createRequest(ownerToken, workspaceId, collectionId, {
        name: 'Viewer Export Target',
        method: 'GET',
        url: 'https://api.example.com/viewer-test',
      });

      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/requests/${req.id}/export/curl`,
        {
          headers: { Authorization: `Bearer ${viewerToken}` },
        }
      );
      assert.equal(res.status, 200);
    });
  });
});

