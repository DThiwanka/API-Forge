import memberRepository from '../../repositories/member.repository.js';
import { WORKSPACE_ROLES, ROLE_HIERARCHY, hasMinimumRole } from '../../constants/workspaceRoles.js';
import { AppError } from '../../utils/appError.js';

/**
 * Format a member record into safe public data
 * @param {object} member
 * @returns {object}
 */
export function formatMember(member) {
  if (!member) return null;
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    userId: member.userId,
    role: member.role,
    name: member.user?.name || null,
    email: member.user?.email || null,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

/**
 * List all members in a workspace with non-sensitive data
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function listMembers(workspaceId) {
  if (!workspaceId) return [];
  const members = await memberRepository.listMembers(workspaceId);
  return members.map(formatMember);
}

/**
 * Update a member's role in a workspace
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.memberId
 * @param {string} params.newRole
 * @param {string} params.actorUserId
 * @param {string} params.actorRole
 * @returns {Promise<object>}
 */
export async function updateMemberRole({
  workspaceId,
  memberId,
  newRole,
  actorUserId,
  actorRole,
}) {
  if (!workspaceId || !memberId || !newRole) {
    throw new AppError('Workspace ID, Member ID, and new role are required', 400);
  }

  // 1. Validate role enum
  const targetRole = newRole.toUpperCase();
  if (!Object.values(WORKSPACE_ROLES).includes(targetRole)) {
    throw new AppError(`Invalid workspace role: ${newRole}`, 400);
  }

  // 2. Fetch target member
  const member = await memberRepository.findById(memberId);
  if (!member || member.workspaceId !== workspaceId) {
    throw new AppError('Workspace member not found', 404);
  }

  // 3. User cannot elevate themselves
  if (member.userId === actorUserId && ROLE_HIERARCHY[targetRole] > ROLE_HIERARCHY[actorRole]) {
    const err = new AppError('You cannot elevate your own workspace role', 403);
    err.code = 'SELF_ELEVATION_PROHIBITED';
    throw err;
  }

  // 4. Actor cannot assign a role higher than their own role
  if (ROLE_HIERARCHY[targetRole] > ROLE_HIERARCHY[actorRole]) {
    throw new AppError(`Cannot assign a role higher than your own (${actorRole})`, 403);
  }

  // 5. Admin cannot modify an Owner's role or assign Owner role
  if (actorRole === WORKSPACE_ROLES.ADMIN) {
    if (member.role === WORKSPACE_ROLES.OWNER) {
      throw new AppError('Admins cannot modify the role of a workspace owner', 403);
    }
    if (targetRole === WORKSPACE_ROLES.OWNER) {
      throw new AppError('Admins cannot assign the OWNER role', 403);
    }
  }

  // 6. Last Owner Protection: Cannot downgrade the only owner
  if (member.role === WORKSPACE_ROLES.OWNER && targetRole !== WORKSPACE_ROLES.OWNER) {
    const ownerCount = await memberRepository.countOwners(workspaceId);
    if (ownerCount <= 1) {
      const err = new AppError('Cannot downgrade the last owner of the workspace', 400);
      err.code = 'LAST_OWNER_PROTECTED';
      throw err;
    }
  }

  // 7. Update role
  const updated = await memberRepository.updateRole(memberId, targetRole);
  return formatMember(updated);
}

/**
 * Remove a member from a workspace
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.memberId
 * @param {string} params.actorUserId
 * @param {string} params.actorRole
 * @returns {Promise<object>}
 */
export async function removeMember({
  workspaceId,
  memberId,
  actorUserId,
  actorRole,
}) {
  if (!workspaceId || !memberId) {
    throw new AppError('Workspace ID and Member ID are required', 400);
  }

  const member = await memberRepository.findById(memberId);
  if (!member || member.workspaceId !== workspaceId) {
    throw new AppError('Workspace member not found', 404);
  }

  // Admin cannot remove an Owner
  if (actorRole === WORKSPACE_ROLES.ADMIN && member.role === WORKSPACE_ROLES.OWNER) {
    throw new AppError('Admins cannot remove a workspace owner', 403);
  }

  // Last Owner Protection: Cannot remove the only owner
  if (member.role === WORKSPACE_ROLES.OWNER) {
    const ownerCount = await memberRepository.countOwners(workspaceId);
    if (ownerCount <= 1) {
      const err = new AppError('Cannot remove the last owner of the workspace', 400);
      err.code = 'LAST_OWNER_PROTECTED';
      throw err;
    }
  }

  await memberRepository.removeMember(memberId);
  return { success: true, removedMemberId: memberId };
}

export default {
  formatMember,
  listMembers,
  updateMemberRole,
  removeMember,
};

