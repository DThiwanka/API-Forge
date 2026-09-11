import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('Collections & Folders Integration Tests', () => {
  let server;
  let baseUrl;

  // Primary workspace users
  let ownerUser;
  let ownerToken;

  let adminUser;
  let adminToken;

  let memberUser;
  let memberToken;

  let viewerUser;
  let viewerToken;

  // Unrelated workspace user
  let strangerUser;
  let strangerToken;

  let workspaceAId;
  let workspaceBId;

  let collectionA1Id;
  let collectionA2Id;
  let collectionB1Id;

  let folderRootId;
  let folderChildId;

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

  before(async () => {
    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // Cleanup any existing cf_ records
    await prisma.workspace.deleteMany({
      where: { name: { startsWith: 'CF_WS_' } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { email: { contains: 'cf_user_' } },
    }).catch(() => {});

    const now = Date.now();
    const owner = await registerUser(`cf_user_owner_${now}@example.com`, 'Owner');
    ownerUser = owner.user;
    ownerToken = owner.token;

    const admin = await registerUser(`cf_user_admin_${now}@example.com`, 'Admin');
    adminUser = admin.user;
    adminToken = admin.token;

    const member = await registerUser(`cf_user_member_${now}@example.com`, 'Member');
    memberUser = member.user;
    memberToken = member.token;

    const viewer = await registerUser(`cf_user_viewer_${now}@example.com`, 'Viewer');
    viewerUser = viewer.user;
    viewerToken = viewer.token;

    const stranger = await registerUser(`cf_user_stranger_${now}@example.com`, 'Stranger');
    strangerUser = stranger.user;
    strangerToken = stranger.token;

    // Create Workspace A (owned by owner)
    const wsA = await createWorkspace(ownerToken, 'CF_WS_A');
    workspaceAId = wsA.id;

    // Add admin, member, viewer to Workspace A
    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: adminUser.id, role: WORKSPACE_ROLES.ADMIN },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: memberUser.id, role: WORKSPACE_ROLES.MEMBER },
    });
    await prisma.workspaceMember.create({
      data: { workspaceId: workspaceAId, userId: viewerUser.id, role: WORKSPACE_ROLES.VIEWER },
    });

    // Create Workspace B (owned by stranger)
    const wsB = await createWorkspace(strangerToken, 'CF_WS_B');
    workspaceBId = wsB.id;
  });

  after(async () => {
    await prisma.workspace.deleteMany({
      where: { name: { startsWith: 'CF_WS_' } },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: { email: { contains: 'cf_user_' } },
    }).catch(() => {});

    await prisma.$disconnect();

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================
  // COLLECTION TESTS
  // ==========================================
  describe('Collection Management', () => {
    it('POST /api/workspaces/:workspaceId/collections - should allow MEMBER to create collection', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Authentication API',
          description: 'Auth endpoints collection',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.collection.name, 'Authentication API');
      assert.equal(body.data.collection.description, 'Auth endpoints collection');
      assert.equal(body.data.collection.workspaceId, workspaceAId);
      assert.equal(body.data.collection.position, 0);

      collectionA1Id = body.data.collection.id;
    });

    it('POST /api/workspaces/:workspaceId/collections - should assign sequential position automatically', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'Users API',
          description: 'User management endpoints',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.data.collection.position, 1);

      collectionA2Id = body.data.collection.id;
    });

    it('POST /api/workspaces/:workspaceId/collections - should reject VIEWER with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ name: 'Unauthorized Collection' }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('POST /api/workspaces/:workspaceId/collections - should reject invalid collection name with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ name: '   ' }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });

    it('GET /api/workspaces/:workspaceId/collections - should list collections ordered by position for VIEWER', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.collections.length, 2);
      assert.equal(body.data.collections[0].name, 'Authentication API');
      assert.equal(body.data.collections[0].position, 0);
      assert.equal(body.data.collections[1].name, 'Users API');
      assert.equal(body.data.collections[1].position, 1);
    });

    it('GET /api/workspaces/:workspaceId/collections/:collectionId - should retrieve single collection', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.collection.id, collectionA1Id);
      assert.equal(body.data.collection.name, 'Authentication API');
    });

    it('PATCH /api/workspaces/:workspaceId/collections/:collectionId - should allow MEMBER to update collection', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'Authentication API v2',
          description: 'Updated description',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.collection.name, 'Authentication API v2');
      assert.equal(body.data.collection.description, 'Updated description');
    });

    it('PATCH /api/workspaces/:workspaceId/collections/:collectionId - should reject VIEWER from updating with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ name: 'Hacked name' }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('DELETE /api/workspaces/:workspaceId/collections/:collectionId - should reject MEMBER from deleting with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('DELETE /api/workspaces/:workspaceId/collections/:collectionId - should allow ADMIN to delete collection', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);

      // Verify collection is deleted from DB
      const check = await prisma.collection.findUnique({
        where: { id: collectionA2Id },
      });
      assert.equal(check, null);
    });

    it('Multi-tenant security - should reject cross-workspace collection access with 404', async () => {
      // Create collection in Workspace B
      const resB = await fetch(`${baseUrl}/workspaces/${workspaceBId}/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({ name: 'Workspace B Private Collection' }),
      });
      const bodyB = await resB.json();
      collectionB1Id = bodyB.data.collection.id;

      // Try to access collectionB1Id via Workspace A URL
      const resCross = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionB1Id}`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const bodyCross = await resCross.json();
      assert.equal(resCross.status, 404);
      assert.equal(bodyCross.success, false);
      assert.match(bodyCross.message, /not found in this workspace/i);
    });
  });

  // ==========================================
  // FOLDER TESTS
  // ==========================================
  describe('Folder Management & Nesting', () => {
    it('POST .../folders - should create a top-level folder (parentId: null)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ name: 'Auth V2 Endpoints' }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.folder.name, 'Auth V2 Endpoints');
      assert.equal(body.data.folder.parentId, null);
      assert.equal(body.data.folder.collectionId, collectionA1Id);
      assert.equal(body.data.folder.position, 0);

      folderRootId = body.data.folder.id;
    });

    it('POST .../folders - should create a nested child folder', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          name: 'OAuth Subfolder',
          parentId: folderRootId,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.folder.name, 'OAuth Subfolder');
      assert.equal(body.data.folder.parentId, folderRootId);
      assert.equal(body.data.folder.position, 0);

      folderChildId = body.data.folder.id;
    });

    it('POST .../folders - should reject parent folder from a different collection with 400', async () => {
      // Create folder in collection B1
      const resFolderB = await fetch(`${baseUrl}/workspaces/${workspaceBId}/collections/${collectionB1Id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({ name: 'Foreign Folder' }),
      });
      const bodyFolderB = await resFolderB.json();
      const foreignFolderId = bodyFolderB.data.folder.id;

      // Try to create folder in collection A1 with parent in collection B1
      const resCross = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'Invalid Cross-Collection Child',
          parentId: foreignFolderId,
        }),
      });

      const bodyCross = await resCross.json();
      assert.equal(resCross.status, 400);
      assert.equal(bodyCross.success, false);
      assert.match(bodyCross.message, /parent folder not found in this collection/i);
    });

    it('GET .../folders - should return flat list of folders', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.folders.length, 2);
    });

    it('GET .../folders?tree=true - should return structured folder hierarchy tree', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders?tree=true`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      // Root level should have 1 folder
      assert.equal(body.data.folders.length, 1);
      assert.equal(body.data.folders[0].id, folderRootId);
      // It should have 1 child
      assert.equal(body.data.folders[0].children.length, 1);
      assert.equal(body.data.folders[0].children[0].id, folderChildId);
    });

    it('GET .../folders/:folderId - should retrieve single folder', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders/${folderChildId}`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.folder.id, folderChildId);
      assert.equal(body.data.folder.name, 'OAuth Subfolder');
    });

    it('PATCH .../folders/:folderId - should reject moving a folder to be its own parent with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders/${folderRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          parentId: folderRootId,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /cannot be its own parent/i);
    });

    it('PATCH .../folders/:folderId - should reject cycle creation (moving parent into its descendant) with 400', async () => {
      // Attempting to set root's parent to child
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders/${folderRootId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          parentId: folderChildId,
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /cannot move a folder into one of its descendants/i);
    });

    it('PATCH .../folders/:folderId - should allow moving folder to top level (parentId: null)', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders/${folderChildId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          parentId: null,
          name: 'Promoted Top-Level Folder',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.folder.parentId, null);
      assert.equal(body.data.folder.name, 'Promoted Top-Level Folder');

      // Now move it back under root for deletion cascade test
      await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders/${folderChildId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          parentId: folderRootId,
        }),
      });
    });

    it('DELETE .../folders/:folderId - should cascade delete folder and its descendants', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders/${folderRootId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);

      // Verify root is deleted
      const checkRoot = await prisma.folder.findUnique({
        where: { id: folderRootId },
      });
      assert.equal(checkRoot, null);

      // Verify child was cascade deleted
      const checkChild = await prisma.folder.findUnique({
        where: { id: folderChildId },
      });
      assert.equal(checkChild, null);
    });

    it('DELETE collection - should cascade delete all contained folders', async () => {
      // Create a folder in Collection A1
      const createRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ name: 'Temp Folder' }),
      });
      const createBody = await createRes.json();
      const tempFolderId = createBody.data.folder.id;

      // Delete the collection
      const delRes = await fetch(`${baseUrl}/workspaces/${workspaceAId}/collections/${collectionA1Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(delRes.status, 200);

      // Verify temp folder was deleted as well
      const checkFolder = await prisma.folder.findUnique({
        where: { id: tempFolderId },
      });
      assert.equal(checkFolder, null);
    });
  });
});

