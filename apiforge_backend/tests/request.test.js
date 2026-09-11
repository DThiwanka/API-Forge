import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('API Request Definition Integration Tests', () => {
  let server;
  let baseUrl;

  // Primary workspace users
  let ownerUser;
  let ownerToken;

  let memberUser;
  let memberToken;

  let viewerUser;
  let viewerToken;

  // Unrelated workspace user
  let strangerUser;
  let strangerToken;

  let workspaceAId;
  let workspaceBId;

  let collectionAId;
  let collectionBId;

  let folderA1Id;
  let folderA2Id;
  let folderBId;

  let requestRootId;
  let requestFolderId;

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

  async function createCollection(token, workspaceId, name) {
    const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections`, {
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

  async function createFolder(token, workspaceId, collectionId, name, parentId = null) {
    const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/collections/${collectionId}/folders`, {
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

  before(async () => {
    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // Cleanup existing req_ records
    await prisma.workspace.deleteMany({
      where: { name: { startsWith: 'Req_WS_' } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { email: { contains: 'req_user_' } },
    }).catch(() => {});

    const now = Date.now();
    const owner = await registerUser(`req_user_owner_${now}@example.com`, 'Owner');
    ownerUser = owner.user;
    ownerToken = owner.token;

    const member = await registerUser(`req_user_member_${now}@example.com`, 'Member');
    memberUser = member.user;
    memberToken = member.token;

    const viewer = await registerUser(`req_user_viewer_${now}@example.com`, 'Viewer');
    viewerUser = viewer.user;
    viewerToken = viewer.token;

    const stranger = await registerUser(`req_user_stranger_${now}@example.com`, 'Stranger');
    strangerUser = stranger.user;
    strangerToken = stranger.token;

    // Create Workspace A (owned by owner)
    const wsA = await createWorkspace(ownerToken, 'Req_WS_A');
    workspaceAId = wsA.id;

    // Add member & viewer to Workspace A
    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: memberUser.id, role: WORKSPACE_ROLES.MEMBER },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: viewerUser.id, role: WORKSPACE_ROLES.VIEWER },
    });

    // Create Workspace B (owned by stranger)
    const wsB = await createWorkspace(strangerToken, 'Req_WS_B');
    workspaceBId = wsB.id;

    // Create Collections
    const colA = await createCollection(ownerToken, workspaceAId, 'Col A');
    collectionAId = colA.id;

    const colB = await createCollection(strangerToken, workspaceBId, 'Col B');
    collectionBId = colB.id;

    // Create Folders in Col A
    const fA1 = await createFolder(ownerToken, workspaceAId, collectionAId, 'Folder A1');
    folderA1Id = fA1.id;

    const fA2 = await createFolder(ownerToken, workspaceAId, collectionAId, 'Folder A2');
    folderA2Id = fA2.id;

    // Create Folder in Col B
    const fB = await createFolder(strangerToken, workspaceBId, collectionBId, 'Folder B');
    folderBId = fB.id;
  });

  after(async () => {
    await prisma.workspace.deleteMany({
      where: { name: { startsWith: 'Req_WS_' } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { email: { contains: 'req_user_' } },
    }).catch(() => {});

    await prisma.$disconnect();

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Request Creation & Validation', () => {
    it('should allow MEMBER to create request at collection root with full configuration', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Get All Users',
          method: 'GET',
          url: '{{baseUrl}}/users',
          queryParams: [
            { key: 'page', value: '1', enabled: true, description: 'Page number' },
            { key: 'limit', value: '20', enabled: true },
          ],
          headers: [
            { key: 'Accept', value: 'application/json', enabled: true },
          ],
          auth: {
            type: 'bearer',
            bearer: { token: 'secret-token' },
          },
          body: {
            mode: 'none',
          },
          settings: {
            timeout: 5000,
          },
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.request.name, 'Get All Users');
      assert.equal(body.data.request.method, 'GET');
      assert.equal(body.data.request.url, '{{baseUrl}}/users');
      assert.equal(body.data.request.folderId, null);
      assert.equal(body.data.request.collectionId, collectionAId);
      assert.equal(body.data.request.position, 0);
      assert.equal(body.data.request.queryParams.length, 2);
      assert.equal(body.data.request.auth.type, 'bearer');

      requestRootId = body.data.request.id;
    });

    it('should allow MEMBER to create request inside a folder', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Create User',
          method: 'POST',
          url: '{{baseUrl}}/users',
          folderId: folderA1Id,
          body: {
            mode: 'json',
            raw: JSON.stringify({ name: 'Dulaj', email: 'dulaj@example.com' }),
          },
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.request.folderId, folderA1Id);
      assert.equal(body.data.request.method, 'POST');
      assert.equal(body.data.request.position, 0);

      requestFolderId = body.data.request.id;
    });

    it('should reject VIEWER from creating a request with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({
          name: 'Unauthorized Request',
          method: 'GET',
          url: '/test',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('should reject invalid HTTP method with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Invalid Method Request',
          method: 'INVALID_METHOD',
          url: '/test',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.errors.some((e) => e.field === 'method'));
    });

    it('should reject missing request name with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          method: 'GET',
          url: '/test',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.errors.some((e) => e.field === 'name'));
    });

    it('should reject invalid auth type with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Bad Auth Request',
          method: 'GET',
          url: '/test',
          auth: { type: 'oauth1' },
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.errors.some((e) => e.field === 'auth.type'));
    });

    it('should reject folder belonging to a different collection with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Cross Collection Folder Request',
          method: 'GET',
          url: '/test',
          folderId: folderBId,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /folder not found in this collection/i);
    });
  });

  describe('Request Listing & Retrieval', () => {
    it('should list all requests for a collection (VIEWER allowed)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.requests.length, 2);
    });

    it('should filter requests by folderId', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests?folderId=${folderA1Id}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.requests.length, 1);
      assert.equal(body.data.requests[0].id, requestFolderId);
    });

    it('should retrieve single request by ID', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.request.id, requestRootId);
      assert.equal(body.data.request.name, 'Get All Users');
    });
  });

  describe('Request Update & Movement', () => {
    it('should allow MEMBER to update request metadata and URL', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Get Users List V2',
          url: '{{baseUrl}}/v2/users',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.request.name, 'Get Users List V2');
      assert.equal(body.data.request.url, '{{baseUrl}}/v2/users');
    });

    it('should allow moving a request into another folder in the same collection', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          folderId: folderA2Id,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.request.folderId, folderA2Id);
    });

    it('should allow moving a request back to collection root (folderId: null)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          folderId: null,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.request.folderId, null);
    });

    it('should reject moving request to a folder in a different collection with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          folderId: folderBId,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /folder not found in this collection/i);
    });

    it('should reject VIEWER from updating request with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ name: 'Hacked Name' }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });
  });

  describe('Request Duplication', () => {
    it('POST .../duplicate - should clone request with Copy suffix and new ID in same folder', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestFolderId}/duplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${memberToken}`,
        },
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.notEqual(body.data.request.id, requestFolderId);
      assert.equal(body.data.request.name, 'Create User Copy');
      assert.equal(body.data.request.method, 'POST');
      assert.equal(body.data.request.folderId, folderA1Id);
      assert.equal(body.data.request.collectionId, collectionAId);

      // Verify original request still exists and was not modified
      const origRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestFolderId}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      const origBody = await origRes.json();
      assert.equal(origBody.data.request.name, 'Create User');
    });
  });

  describe('Multi-Tenant & Cross-Workspace Security', () => {
    it('should reject access to request in Collection A using Workspace B URL with 404', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceBId}/collections/${collectionAId}/requests/${requestRootId}`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });

    it('should reject access to request in Collection B using Collection A URL with 404', async () => {
      // Create request in Collection B
      const createRes = await fetch(`${baseUrl}/workspaces/${workspaceBId}/collections/${collectionBId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({
          name: 'Private Req B',
          method: 'GET',
          url: '/secret',
        }),
      });
      const createBody = await createRes.json();
      const reqBId = createBody.data.request.id;

      // Access reqBId via Collection A
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${reqBId}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });
  });

  describe('Deletion & Cascade Behaviors', () => {
    it('should reject VIEWER from deleting request with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should allow MEMBER to delete request', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests/${requestRootId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);

      // Verify deletion in database
      const check = await prisma.request.findUnique({
        where: { id: requestRootId },
      });
      assert.equal(check, null);
    });

    it('Deleting a folder should move its requests to collection root (onDelete: SetNull)', async () => {
      // Create request in folder A2
      const createRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Folder Orphan Test',
          method: 'GET',
          url: '/test',
          folderId: folderA2Id,
        }),
      });
      const createBody = await createRes.json();
      const orphanTestId = createBody.data.request.id;

      // Delete folder A2
      const delFolderRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}/folders/${folderA2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(delFolderRes.status, 200);

      // Verify the request still exists and its folderId was set to null (moved to root)
      const checkReq = await prisma.request.findUnique({
        where: { id: orphanTestId },
      });
      assert.ok(checkReq);
      assert.equal(checkReq.folderId, null);
    });

    it('Deleting a collection should cascade-delete all its requests', async () => {
      // Delete Collection A
      const delColRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionAId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(delColRes.status, 200);

      // Verify all requests for Collection A are deleted
      const remainingReqs = await prisma.request.findMany({
        where: { collectionId: collectionAId },
      });
      assert.equal(remainingReqs.length, 0);
    });
  });
});

