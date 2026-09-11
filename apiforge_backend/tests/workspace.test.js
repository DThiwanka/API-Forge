import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('Workspace Integration Tests', () => {
  let server;
  let baseUrl;

  // Test users
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

  let testWorkspaceId;

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

  before(async () => {
    // Start server on an ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // Clean up test records
    await prisma.workspaceMember.deleteMany({
      where: {
        workspace: {
          name: { startsWith: 'WS_Test_' },
        },
      },
    }).catch(() => {});

    await prisma.workspace.deleteMany({
      where: {
        name: { startsWith: 'WS_Test_' },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        email: { contains: 'wstest_' },
      },
    }).catch(() => {});

    // Register test users
    const now = Date.now();
    const owner = await registerUser(`wstest_owner_${now}@example.com`, 'Owner User');
    ownerUser = owner.user;
    ownerToken = owner.token;

    const admin = await registerUser(`wstest_admin_${now}@example.com`, 'Admin User');
    adminUser = admin.user;
    adminToken = admin.token;

    const member = await registerUser(`wstest_member_${now}@example.com`, 'Member User');
    memberUser = member.user;
    memberToken = member.token;

    const viewer = await registerUser(`wstest_viewer_${now}@example.com`, 'Viewer User');
    viewerUser = viewer.user;
    viewerToken = viewer.token;

    const stranger = await registerUser(`wstest_stranger_${now}@example.com`, 'Stranger User');
    strangerUser = stranger.user;
    strangerToken = stranger.token;
  });

  after(async () => {
    // Clean up all test data
    await prisma.workspace.deleteMany({
      where: {
        name: { startsWith: 'WS_Test_' },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        email: { contains: 'wstest_' },
      },
    }).catch(() => {});

    await prisma.$disconnect();

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('POST /api/workspaces (Workspace Creation)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await fetch(`${baseUrl}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'WS_Test_Unauth' }),
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
    });

    it('should fail with 400 when workspace name is missing or empty', async () => {
      const res = await fetch(`${baseUrl}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ name: '   ' }),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.errors.some((e) => e.field === 'name'));
    });

    it('should create workspace and assign creator as OWNER in a single transaction', async () => {
      const res = await fetch(`${baseUrl}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'WS_Test_Main',
          description: 'A test workspace for APIForge',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.workspace.name, 'WS_Test_Main');
      assert.equal(body.data.workspace.description, 'A test workspace for APIForge');
      assert.equal(body.data.workspace.role, WORKSPACE_ROLES.OWNER);
      assert.ok(body.data.workspace.id);

      testWorkspaceId = body.data.workspace.id;

      // Verify membership record in database
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspace_user_unique: {
            workspaceId: testWorkspaceId,
            userId: ownerUser.id,
          },
        },
      });

      assert.ok(membership);
      assert.equal(membership.role, WORKSPACE_ROLES.OWNER);
    });

    it('should reject duplicate membership creation for the same user', async () => {
      await assert.rejects(
        async () => {
          await prisma.workspaceMember.create({
            data: {
              workspaceId: testWorkspaceId,
              userId: ownerUser.id,
              role: WORKSPACE_ROLES.ADMIN,
            },
          });
        },
        (err) => {
          assert.match(err.message, /unique/i);
          return true;
        }
      );
    });
  });

  describe('GET /api/workspaces (List Workspaces)', () => {
    it('should list only workspaces the authenticated user belongs to', async () => {
      // Owner should see WS_Test_Main
      const resOwner = await fetch(`${baseUrl}/workspaces`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const bodyOwner = await resOwner.json();
      assert.equal(resOwner.status, 200);
      assert.equal(bodyOwner.success, true);
      const found = bodyOwner.data.workspaces.find((w) => w.id === testWorkspaceId);
      assert.ok(found);
      assert.equal(found.role, WORKSPACE_ROLES.OWNER);

      // Stranger should NOT see WS_Test_Main
      const resStranger = await fetch(`${baseUrl}/workspaces`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });
      const bodyStranger = await resStranger.json();
      assert.equal(resStranger.status, 200);
      assert.equal(bodyStranger.success, true);
      assert.equal(
        bodyStranger.data.workspaces.some((w) => w.id === testWorkspaceId),
        false
      );
    });
  });

  describe('GET /api/workspaces/:workspaceId (Get Workspace)', () => {
    before(async () => {
      // Add admin, member, viewer to testWorkspaceId
      await prisma.workspaceMember.create({
        data: { workspaceId: testWorkspaceId, userId: adminUser.id, role: WORKSPACE_ROLES.ADMIN },
      });
      await prisma.workspaceMember.create({
        data: { workspaceId: testWorkspaceId, userId: memberUser.id, role: WORKSPACE_ROLES.MEMBER },
      });
      await prisma.workspaceMember.create({
        data: { workspaceId: testWorkspaceId, userId: viewerUser.id, role: WORKSPACE_ROLES.VIEWER },
      });
    });

    it('should allow OWNER, ADMIN, MEMBER, and VIEWER to retrieve workspace', async () => {
      for (const { token, expectedRole } of [
        { token: ownerToken, expectedRole: WORKSPACE_ROLES.OWNER },
        { token: adminToken, expectedRole: WORKSPACE_ROLES.ADMIN },
        { token: memberToken, expectedRole: WORKSPACE_ROLES.MEMBER },
        { token: viewerToken, expectedRole: WORKSPACE_ROLES.VIEWER },
      ]) {
        const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.workspace.id, testWorkspaceId);
        assert.equal(body.data.workspace.role, expectedRole);
      }
    });

    it('should reject non-member (stranger) with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        headers: { Authorization: `Bearer ${strangerToken}` },
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /not a member/i);
    });

    it('should return 404 for nonexistent workspace ID', async () => {
      const res = await fetch(`${baseUrl}/workspaces/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const body = await res.json();
      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });
  });

  describe('PATCH /api/workspaces/:workspaceId (Update Workspace)', () => {
    it('should allow OWNER to update workspace name and description', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: 'WS_Test_Updated_By_Owner',
          description: 'Updated by owner',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.workspace.name, 'WS_Test_Updated_By_Owner');
      assert.equal(body.data.workspace.description, 'Updated by owner');
    });

    it('should allow ADMIN to update workspace name', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'WS_Test_Updated_By_Admin',
        }),
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.workspace.name, 'WS_Test_Updated_By_Admin');
    });

    it('should reject MEMBER from updating workspace with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ name: 'WS_Test_Hack_By_Member' }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('should reject VIEWER from updating workspace with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ name: 'WS_Test_Hack_By_Viewer' }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('should reject non-member (stranger) from updating with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({ name: 'WS_Test_Hack_By_Stranger' }),
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should reject empty update body with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({}),
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
    });
  });

  describe('DELETE /api/workspaces/:workspaceId (Delete Workspace)', () => {
    it('should reject ADMIN from deleting workspace with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('should reject MEMBER from deleting workspace with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /insufficient permissions/i);
    });

    it('should reject non-member (stranger) from deleting workspace with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${strangerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
    });

    it('should allow OWNER to delete workspace and cascade delete all memberships', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.match(body.message, /deleted successfully/i);

      // Verify workspace is deleted from DB
      const wsCheck = await prisma.workspace.findUnique({
        where: { id: testWorkspaceId },
      });
      assert.equal(wsCheck, null);

      // Verify all memberships were cascade deleted
      const memberCheck = await prisma.workspaceMember.findMany({
        where: { workspaceId: testWorkspaceId },
      });
      assert.equal(memberCheck.length, 0);
    });
  });
});
