import prisma from '../config/database.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

/**
 * Find workspace member by member ID
 * @param {string} memberId
 * @returns {Promise<object|null>}
 */
export async function findById(memberId) {
  if (!memberId) return null;
  return prisma.workspaceMember.findUnique({
    where: { id: memberId },
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

/**
 * Find membership for a specific user in a workspace
 * @param {string} workspaceId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findMembership(workspaceId, userId) {
  if (!workspaceId || !userId) return null;
  return prisma.workspaceMember.findUnique({
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
}

/**
 * List all members of a workspace with sanitized user information
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function listMembers(workspaceId) {
  if (!workspaceId) return [];
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Count the number of owners in a workspace
 * @param {string} workspaceId
 * @param {object} [tx] - Optional transaction client
 * @returns {Promise<number>}
 */
export async function countOwners(workspaceId, tx = prisma) {
  return tx.workspaceMember.count({
    where: {
      workspaceId,
      role: WORKSPACE_ROLES.OWNER,
    },
  });
}

/**
 * Update member role
 * @param {string} memberId
 * @param {string} role
 * @param {object} [tx] - Optional transaction client
 * @returns {Promise<object>}
 */
export async function updateRole(memberId, role, tx = prisma) {
  return tx.workspaceMember.update({
    where: { id: memberId },
    data: { role },
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

/**
 * Remove a member from a workspace
 * @param {string} memberId
 * @param {object} [tx] - Optional transaction client
 * @returns {Promise<object>}
 */
export async function removeMember(memberId, tx = prisma) {
  return tx.workspaceMember.delete({
    where: { id: memberId },
  });
}

export default {
  findById,
  findMembership,
  listMembers,
  countOwners,
  updateRole,
  removeMember,
};

