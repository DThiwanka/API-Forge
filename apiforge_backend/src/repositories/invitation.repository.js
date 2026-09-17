import prisma from '../config/database.js';

/**
 * Create a new workspace invitation
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} params.tokenHash
 * @param {Date} params.expiresAt
 * @param {string} params.invitedById
 * @returns {Promise<object>}
 */
export async function create({
  workspaceId,
  email,
  role,
  tokenHash,
  expiresAt,
  invitedById,
}) {
  return prisma.workspaceInvitation.create({
    data: {
      workspaceId,
      email,
      role,
      tokenHash,
      expiresAt,
      invitedById,
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Find invitation by token hash
 * @param {string} tokenHash
 * @returns {Promise<object|null>}
 */
export async function findByTokenHash(tokenHash) {
  if (!tokenHash) return null;
  return prisma.workspaceInvitation.findUnique({
    where: { tokenHash },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Find invitation by ID
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.workspaceInvitation.findUnique({
    where: { id },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Find active (pending) invitation for workspace and email
 * @param {string} workspaceId
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findActiveByWorkspaceAndEmail(workspaceId, email) {
  if (!workspaceId || !email) return null;
  return prisma.workspaceInvitation.findFirst({
    where: {
      workspaceId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * List all invitations for a workspace
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function listByWorkspace(workspaceId) {
  if (!workspaceId) return [];
  return prisma.workspaceInvitation.findMany({
    where: { workspaceId },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Revoke an invitation by setting revokedAt timestamp
 * @param {string} invitationId
 * @returns {Promise<object>}
 */
export async function revoke(invitationId) {
  return prisma.workspaceInvitation.update({
    where: { id: invitationId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke active invitations for workspace and email
 * @param {string} workspaceId
 * @param {string} email
 * @returns {Promise<number>}
 */
export async function revokeActiveByWorkspaceAndEmail(workspaceId, email) {
  const result = await prisma.workspaceInvitation.updateMany({
    where: {
      workspaceId,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  return result.count;
}

/**
 * Atomically accept an invitation and create workspace membership
 * @param {object} params
 * @param {string} params.invitationId
 * @param {string} params.workspaceId
 * @param {string} params.userId
 * @param {string} params.role
 * @returns {Promise<{ member: object, invitation: object }>}
 */
export async function acceptTransactionally({
  invitationId,
  workspaceId,
  userId,
  role,
}) {
  return prisma.$transaction(async (tx) => {
    // Check if membership already exists (idempotency guard)
    let member = await tx.workspaceMember.findUnique({
      where: {
        workspace_user_unique: {
          workspaceId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!member) {
      member = await tx.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    }

    const invitation = await tx.workspaceInvitation.update({
      where: { id: invitationId },
      data: { acceptedAt: new Date() },
    });

    return { member, invitation };
  });
}

export default {
  create,
  findByTokenHash,
  findById,
  findActiveByWorkspaceAndEmail,
  listByWorkspace,
  revoke,
  revokeActiveByWorkspaceAndEmail,
  acceptTransactionally,
};

