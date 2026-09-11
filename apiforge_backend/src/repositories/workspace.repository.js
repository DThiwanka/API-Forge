import prisma from '../config/database.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

/**
 * Create a new workspace and assign the creator as OWNER in a single transaction.
 * @param {object} params
 * @param {string} params.name
 * @param {string} [params.description]
 * @param {string} params.userId
 * @returns {Promise<object>}
 */
export async function createWithMember({ name, description = null, userId }) {
  return prisma.workspace.create({
    data: {
      name,
      description: description || null,
      members: {
        create: {
          userId,
          role: WORKSPACE_ROLES.OWNER,
        },
      },
    },
    include: {
      members: {
        where: { userId },
      },
    },
  });
}

/**
 * Find workspace by ID
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  if (!id) return null;
  return prisma.workspace.findUnique({
    where: { id },
  });
}

/**
 * Find membership for a specific user and workspace
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
  });
}

/**
 * List all workspaces where the user is a member
 * @param {string} userId 
 * @returns {Promise<Array<object>>}
 */
export async function listForUser(userId) {
  if (!userId) return [];
  return prisma.workspace.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
    include: {
      members: {
        where: { userId },
        select: {
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Update a workspace
 * @param {string} id 
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function update(id, data) {
  return prisma.workspace.update({
    where: { id },
    data,
  });
}

/**
 * Delete a workspace (cascades to workspace members)
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function deleteWorkspace(id) {
  return prisma.workspace.delete({
    where: { id },
  });
}

/**
 * Create a workspace membership for a user
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.userId
 * @param {string} [params.role]
 * @returns {Promise<object>}
 */
export async function createMembership({ workspaceId, userId, role = WORKSPACE_ROLES.MEMBER }) {
  return prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId,
      role,
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

export default {
  createWithMember,
  findById,
  findMembership,
  listForUser,
  update,
  deleteWorkspace,
  createMembership,
  listMembers,
};

