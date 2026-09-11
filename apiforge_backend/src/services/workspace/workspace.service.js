import workspaceRepository from '../../repositories/workspace.repository.js';
import { WORKSPACE_ROLES, hasMinimumRole } from '../../constants/workspaceRoles.js';
import { AppError } from '../../utils/appError.js';

/**
 * Format a workspace object for API responses
 * @param {object} workspace 
 * @param {string} [role] 
 * @returns {object}
 */
export function formatWorkspaceResponse(workspace, role = null) {
  if (!workspace) return null;
  const formatted = {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
  };

  if (role) {
    formatted.role = role;
  } else if (workspace.members && workspace.members.length > 0) {
    formatted.role = workspace.members[0].role;
  }

  return formatted;
}

/**
 * Create a new workspace and establish initial OWNER membership
 * @param {object} params
 * @param {string} params.name
 * @param {string} [params.description]
 * @param {string} params.userId
 * @returns {Promise<object>}
 */
export async function createWorkspace({ name, description, userId }) {
  const workspace = await workspaceRepository.createWithMember({
    name,
    description,
    userId,
  });

  return formatWorkspaceResponse(workspace, WORKSPACE_ROLES.OWNER);
}

/**
 * List all workspaces accessible to the authenticated user
 * @param {string} userId 
 * @returns {Promise<Array<object>>}
 */
export async function listUserWorkspaces(userId) {
  const workspaces = await workspaceRepository.listForUser(userId);
  return workspaces.map((ws) => formatWorkspaceResponse(ws));
}

/**
 * Retrieve a single workspace if the user is an authorized member
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.userId
 * @returns {Promise<object>}
 */
export async function getWorkspace({ workspaceId, userId }) {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new AppError('Workspace not found', 404);
  }

  const membership = await workspaceRepository.findMembership(workspaceId, userId);
  if (!membership) {
    throw new AppError('Access denied: You are not a member of this workspace', 403);
  }

  return formatWorkspaceResponse(workspace, membership.role);
}

/**
 * Update workspace metadata (requires ADMIN or OWNER)
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {object} params.updateData
 * @param {string} params.userRole
 * @returns {Promise<object>}
 */
export async function updateWorkspace({ workspaceId, updateData, userRole }) {
  if (!hasMinimumRole(userRole, WORKSPACE_ROLES.ADMIN)) {
    throw new AppError('Insufficient permissions: Only OWNER or ADMIN can update this workspace', 403);
  }

  const updated = await workspaceRepository.update(workspaceId, updateData);
  return formatWorkspaceResponse(updated, userRole);
}

/**
 * Delete a workspace (strictly requires OWNER)
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.userRole
 * @returns {Promise<boolean>}
 */
export async function deleteWorkspace({ workspaceId, userRole }) {
  if (userRole !== WORKSPACE_ROLES.OWNER) {
    throw new AppError('Insufficient permissions: Only the workspace OWNER can delete this workspace', 403);
  }

  await workspaceRepository.deleteWorkspace(workspaceId);
  return true;
}

export default {
  formatWorkspaceResponse,
  createWorkspace,
  listUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
};

