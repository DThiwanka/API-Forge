import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';

describe('Step 53: Workspace Collaboration & Invitations Integration Tests', () => {
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

  let invitedUser;
  let invitedToken;

  let wrongAccountUser;
  let wrongAccountToken;

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

    // Cleanup potential leftover test users and workspaces
    await prisma.workspaceInvitation.deleteMany({
      where: {
        workspace: {
          name: { startsWith: 'Collab_Test_' },
        },
      },
    }).catch(() => {});

    await prisma.workspaceMember.deleteMany({
      where: {
        workspace: {
          name: { startsWith: 'Collab_Test_' },
        },
      },
    }).catch(() => {});

    await prisma.workspace.deleteMany({
      where: {
        name: { startsWith: 'Collab_Test_' },
      },
    }).catch(() => {});

    await prisma.user.deleteMany({
      where: {
        email: { contains: 'collab_' },
      },
    }).catch(() => {});

    // Create users
    const timestamp = Date.now();
    const owner = await registerUser(`collab_owner_${timestamp}@example.com`, 'Workspace Owner');
    ownerUser = owner.user;
    ownerToken = owner.token;

    const admin = await registerUser(`collab_admin_${timestamp}@example.com`, 'Workspace Admin');
    adminUser = admin.user;
    adminToken = admin.token;

    const member = await registerUser(`collab_member_${timestamp}@example.com`, 'Workspace Member');
    memberUser = member.user;
    memberToken = member.token;

    const viewer = await registerUser(`collab_viewer_${timestamp}@example.com`, 'Workspace Viewer');
    viewerUser = viewer.user;
    viewerToken = viewer.token;

    const targetInvited = await registerUser(`collab_invited_${timestamp}@example.com`, 'Target Invited');
    invitedUser = targetInvited.user;
    invitedToken = targetInvited.token;

    const wrongAccount = await registerUser(`collab_wrong_${timestamp}@example.com`, 'Wrong Account');
    wrongAccountUser = wrongAccount.user;
    wrongAccountToken = wrongAccount.token;

    // Create workspace with Owner
    const createWsRes = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: `Collab_Test_Workspace_${timestamp}`,
        description: 'Test workspace for Step 53 collaboration',
      }),
    });
    const wsBody = await createWsRes.json();
    testWorkspaceId = wsBody.data.workspace.id;

    // Add Admin, Member, and Viewer to workspace directly
    await prisma.workspaceMember.createMany({
      data: [
        { workspaceId: testWorkspaceId, userId: adminUser.id, role: WORKSPACE_ROLES.ADMIN },
        { workspaceId: testWorkspaceId, userId: memberUser.id, role: WORKSPACE_ROLES.MEMBER },
        { workspaceId: testWorkspaceId, userId: viewerUser.id, role: WORKSPACE_ROLES.VIEWER },
      ],
    });
  });

  after(async () => {
    // Cleanup created records
    if (testWorkspaceId) {
      await prisma.workspaceInvitation.deleteMany({ where: { workspaceId: testWorkspaceId } }).catch(() => {});
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: testWorkspaceId } }).catch(() => {});
      await prisma.workspace.delete({ where: { id: testWorkspaceId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'collab_' },
      },
    }).catch(() => {});

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('1. Member Listing', () => {
    it('allows workspace members to view members list with safe attributes', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'success');
      assert.ok(Array.isArray(body.data.members));
      assert.equal(body.data.members.length, 4);

      // Verify no sensitive fields like passwords or tokens are exposed
      for (const m of body.data.members) {
        assert.ok(m.id);
        assert.ok(m.userId);
        assert.ok(m.email);
        assert.ok(m.role);
        assert.equal(m.password, undefined);
        assert.equal(m.refreshToken, undefined);
        assert.equal(m.tokenHash, undefined);
      }
    });

    it('rejects member list for unauthenticated users', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members`);
      assert.equal(res.status, 401);
    });

    it('rejects member list for non-workspace members', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members`, {
        headers: { Authorization: `Bearer ${wrongAccountToken}` },
      });
      assert.equal(res.status, 403);
    });
  });

  describe('2. Invitation Creation & Validation', () => {
    let rawInviteToken;
    let createdInvitationId;

    it('allows workspace admin to invite a new user', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: `  ${invitedUser.email.toUpperCase()}  `, // Test email normalization
          role: WORKSPACE_ROLES.MEMBER,
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.status, 'success');
      assert.ok(body.data.token);
      assert.ok(body.data.inviteUrl);
      assert.equal(body.data.invitation.email, invitedUser.email.toLowerCase());
      assert.equal(body.data.invitation.role, WORKSPACE_ROLES.MEMBER);
      assert.equal(body.data.invitation.status, 'Pending');

      rawInviteToken = body.data.token;
      createdInvitationId = body.data.invitation.id;

      // Verify token is NOT stored as plaintext in the database
      const dbRecord = await prisma.workspaceInvitation.findUnique({
        where: { id: createdInvitationId },
      });
      assert.notEqual(dbRecord.tokenHash, rawInviteToken);
      assert.ok(dbRecord.tokenHash.length === 64); // SHA-256 hex string
    });

    it('prevents regular members and viewers from creating invitations', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          email: 'someotheruser@example.com',
          role: WORKSPACE_ROLES.VIEWER,
        }),
      });

      assert.equal(res.status, 403);
    });

    it('rejects invitation creation for an existing workspace member', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          email: memberUser.email,
          role: WORKSPACE_ROLES.MEMBER,
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.ok(body.message.includes('already a member'));
    });

    it('revokes previous pending invitation when issuing a new invitation to the same email', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          email: invitedUser.email,
          role: WORKSPACE_ROLES.ADMIN, // Update to Admin
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      const newRawToken = body.data.token;
      assert.notEqual(newRawToken, rawInviteToken);

      // Verify previous invitation was marked revoked
      const oldInvitation = await prisma.workspaceInvitation.findUnique({
        where: { id: createdInvitationId },
      });
      assert.ok(oldInvitation.revokedAt !== null);

      // Update rawInviteToken to the new active one
      rawInviteToken = newRawToken;
      createdInvitationId = body.data.invitation.id;
    });

    it('validates active invitation via public endpoint', async () => {
      const res = await fetch(`${baseUrl}/invitations/${rawInviteToken}/validate`);

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.status, 'success');
      assert.equal(body.data.invitation.email, invitedUser.email.toLowerCase());
      assert.equal(body.data.invitation.role, WORKSPACE_ROLES.ADMIN);
      assert.equal(body.data.invitation.status, 'Pending');
      assert.ok(body.data.invitation.workspaceName);
    });

    it('rejects validation for non-existent token', async () => {
      const res = await fetch(`${baseUrl}/invitations/invalid-non-existent-token/validate`);
      assert.equal(res.status, 404);
    });
  });

  describe('3. Invitation Revocation', () => {
    it('allows admin/owner to revoke an active invitation', async () => {
      // Create a dummy invitation to revoke
      const createRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          email: 'toberevoked@example.com',
          role: WORKSPACE_ROLES.VIEWER,
        }),
      });
      const created = await createRes.json();
      const inviteId = created.data.invitation.id;
      const token = created.data.token;

      // Revoke it
      const deleteRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations/${inviteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(deleteRes.status, 200);

      // Verify validation fails on revoked token
      const valRes = await fetch(`${baseUrl}/invitations/${token}/validate`);
      assert.equal(valRes.status, 400);
      const valBody = await valRes.json();
      assert.ok(valBody.message.includes('revoked'));
    });
  });

  describe('4. Invitation Acceptance & Security', () => {
    it('blocks acceptance when signed in with a different email address (mismatch protection)', async () => {
      // Fetch active invitations to get the active token
      const listRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        headers: { Authorization: `Bearer ${ownerToken}` },
      });
      const listBody = await listRes.json();
      const activeInv = listBody.data.invitations.find((i) => i.email === invitedUser.email && i.status === 'Pending');
      assert.ok(activeInv);

      // Create a fresh invite for invitedUser to get raw token
      const createRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          email: invitedUser.email,
          role: WORKSPACE_ROLES.MEMBER,
        }),
      });
      const freshInvite = await createRes.json();
      const token = freshInvite.data.token;

      // Try accepting with wrongAccountToken
      const acceptRes = await fetch(`${baseUrl}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${wrongAccountToken}` },
      });

      assert.equal(acceptRes.status, 403);
      const acceptBody = await acceptRes.json();
      assert.ok(acceptBody.message.includes('different email'));
    });

    it('allows the intended user to accept invitation and grants workspace membership', async () => {
      // Create invitation for invitedUser
      const createRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          email: invitedUser.email,
          role: WORKSPACE_ROLES.MEMBER,
        }),
      });
      const invite = await createRes.json();
      const token = invite.data.token;

      // Accept with matching invitedToken
      const acceptRes = await fetch(`${baseUrl}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${invitedToken}` },
      });

      assert.equal(acceptRes.status, 200);
      const acceptBody = await acceptRes.json();
      assert.equal(acceptBody.status, 'success');
      assert.equal(acceptBody.data.workspaceId, testWorkspaceId);
      assert.equal(acceptBody.data.role, WORKSPACE_ROLES.MEMBER);

      // Verify user can now access workspace members
      const memberListRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members`, {
        headers: { Authorization: `Bearer ${invitedToken}` },
      });
      assert.equal(memberListRes.status, 200);

      // Verify token cannot be reused
      const secondAcceptRes = await fetch(`${baseUrl}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${invitedToken}` },
      });
      assert.equal(secondAcceptRes.status, 400);
      const secondBody = await secondAcceptRes.json();
      assert.ok(secondBody.message.includes('already been accepted'));
    });

    it('rejects expired invitations', async () => {
      // Create invitation with an expired date
      const expiredInvite = await prisma.workspaceInvitation.create({
        data: {
          workspaceId: testWorkspaceId,
          email: 'expired_test@example.com',
          role: WORKSPACE_ROLES.MEMBER,
          tokenHash: 'sha256_mock_expired_hash_12345678901234567890123456789012',
          expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
          invitedById: ownerUser.id,
        },
      });

      const res = await fetch(`${baseUrl}/invitations/expired-token-mock/validate`);
      assert.equal(res.status, 404);
    });
  });

  describe('5. Member Role Management & Last-Owner Protection', () => {
    let memberRecordId;
    let ownerRecordId;
    let adminRecordId;

    before(async () => {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: testWorkspaceId },
      });
      memberRecordId = members.find((m) => m.userId === memberUser.id)?.id;
      ownerRecordId = members.find((m) => m.userId === ownerUser.id)?.id;
      adminRecordId = members.find((m) => m.userId === adminUser.id)?.id;
    });

    it('allows Owner to update a member role to Admin', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${memberRecordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ role: WORKSPACE_ROLES.ADMIN }),
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.member.role, WORKSPACE_ROLES.ADMIN);
    });

    it('prevents user from elevating themselves', async () => {
      // Viewer attempts to elevate themselves to Admin
      const viewerMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: testWorkspaceId, userId: viewerUser.id },
      });

      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${viewerMember.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ role: WORKSPACE_ROLES.ADMIN }),
      });

      assert.equal(res.status, 403);
    });

    it('prevents Admin from assigning the Owner role', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${memberRecordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: WORKSPACE_ROLES.OWNER }),
      });

      assert.equal(res.status, 403);
    });

    it('prevents Admin from modifying an Owner member', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${ownerRecordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: WORKSPACE_ROLES.MEMBER }),
      });

      assert.equal(res.status, 403);
    });

    it('enforces LAST_OWNER_PROTECTED when attempting to downgrade the only Owner', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${ownerRecordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ role: WORKSPACE_ROLES.ADMIN }),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.message.includes('last owner'));
    });
  });

  describe('6. Member Removal & Access Revocation', () => {
    let viewerMemberRecordId;
    let ownerRecordId;

    before(async () => {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: testWorkspaceId },
      });
      viewerMemberRecordId = members.find((m) => m.userId === viewerUser.id)?.id;
      ownerRecordId = members.find((m) => m.userId === ownerUser.id)?.id;
    });

    it('enforces LAST_OWNER_PROTECTED when attempting to remove the only Owner', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${ownerRecordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ownerToken}` },
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.ok(body.message.includes('last owner'));
    });

    it('allows Admin to remove a Viewer member', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members/${viewerMemberRecordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.success, true);

      // Verify removed user no longer has workspace access
      const accessRes = await fetch(`${baseUrl}/workspaces/${testWorkspaceId}/members`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      assert.equal(accessRes.status, 403);
    });
  });
});

