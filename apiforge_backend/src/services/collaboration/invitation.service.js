import crypto from 'node:crypto';
import invitationRepository from '../../repositories/invitation.repository.js';
import memberRepository from '../../repositories/member.repository.js';
import userRepository from '../../repositories/user.repository.js';
import workspaceRepository from '../../repositories/workspace.repository.js';
import { WORKSPACE_ROLES, hasMinimumRole } from '../../constants/workspaceRoles.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';

/**
 * Derive the authoritative state of an invitation
 * @param {object} invitation
 * @returns {'Pending' | 'Accepted' | 'Revoked' | 'Expired'}
 */
export function getInvitationStatus(invitation) {
  if (!invitation) return 'Expired';
  if (invitation.acceptedAt) return 'Accepted';
  if (invitation.revokedAt) return 'Revoked';
  if (new Date(invitation.expiresAt) <= new Date()) return 'Expired';
  return 'Pending';
}

/**
 * Hash raw invitation token with SHA-256
 * @param {string} token
 * @returns {string}
 */
export function hashInvitationToken(token) {
  if (!token || typeof token !== 'string') return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Format invitation object safely without exposing token hashes
 * @param {object} invitation
 * @returns {object}
 */
export function formatInvitation(invitation) {
  if (!invitation) return null;
  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    email: invitation.email,
    role: invitation.role,
    status: getInvitationStatus(invitation),
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    invitedBy: invitation.invitedBy
      ? {
          id: invitation.invitedBy.id,
          name: invitation.invitedBy.name,
          email: invitation.invitedBy.email,
        }
      : null,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };
}

/**
 * Create a new workspace invitation
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} params.inviterUserId
 * @param {string} params.inviterRole
 * @returns {Promise<{ invitation: object, token: string, inviteUrl: string }>}
 */
export async function createInvitation({
  workspaceId,
  email,
  role = WORKSPACE_ROLES.MEMBER,
  inviterUserId,
  inviterRole,
}) {
  if (!workspaceId) {
    throw new AppError('Workspace ID is required', 400);
  }

  // 1. Verify inviter permissions
  if (!hasMinimumRole(inviterRole, WORKSPACE_ROLES.ADMIN)) {
    throw new AppError('Insufficient permissions to invite workspace members', 403);
  }

  // 2. Validate role
  const targetRole = (role || WORKSPACE_ROLES.MEMBER).toUpperCase();
  if (!Object.values(WORKSPACE_ROLES).includes(targetRole)) {
    throw new AppError(`Invalid workspace role: ${role}`, 400);
  }

  // Only OWNER can invite as OWNER
  if (targetRole === WORKSPACE_ROLES.OWNER && inviterRole !== WORKSPACE_ROLES.OWNER) {
    throw new AppError('Only workspace owners can assign the OWNER role', 403);
  }

  // 3. Normalize email
  if (!email || typeof email !== 'string') {
    throw new AppError('A valid email address is required', 400);
  }
  const normalizedEmail = email.trim().toLowerCase();

  // 4. Verify workspace exists
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new AppError('Workspace not found', 404);
  }

  // 5. Verify target user is not already a member
  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    const existingMembership = await memberRepository.findMembership(workspaceId, existingUser.id);
    if (existingMembership) {
      const err = new AppError('User is already a member of this workspace', 409);
      err.code = 'USER_ALREADY_MEMBER';
      throw err;
    }
  }

  // 6. Prevent duplicate active invitations: Revoke older pending invitations for this email/workspace
  await invitationRepository.revokeActiveByWorkspaceAndEmail(workspaceId, normalizedEmail);

  // 7. Generate cryptographically secure token & hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);

  // 8. Calculate expiration
  const expirationHours = env.INVITATION_EXPIRATION_HOURS || 168;
  const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

  // 9. Store invitation
  const createdInvitation = await invitationRepository.create({
    workspaceId,
    email: normalizedEmail,
    role: targetRole,
    tokenHash,
    expiresAt,
    invitedById: inviterUserId,
  });

  const inviteUrl = `${env.CLIENT_URL}/invite/${rawToken}`;

  return {
    invitation: formatInvitation(createdInvitation),
    token: rawToken,
    inviteUrl,
  };
}

/**
 * List all invitations for a workspace
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function listInvitations(workspaceId) {
  if (!workspaceId) return [];
  const invitations = await invitationRepository.listByWorkspace(workspaceId);
  return invitations.map(formatInvitation);
}

/**
 * Revoke an active invitation
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.invitationId
 * @returns {Promise<object>}
 */
export async function revokeInvitation({ workspaceId, invitationId }) {
  if (!workspaceId || !invitationId) {
    throw new AppError('Workspace ID and Invitation ID are required', 400);
  }

  const invitation = await invitationRepository.findById(invitationId);
  if (!invitation || invitation.workspaceId !== workspaceId) {
    throw new AppError('Invitation not found', 404);
  }

  if (invitation.acceptedAt) {
    throw new AppError('Cannot revoke an already accepted invitation', 400);
  }

  if (invitation.revokedAt) {
    // Idempotent return
    return formatInvitation(invitation);
  }

  const updated = await invitationRepository.revoke(invitationId);
  return formatInvitation(updated);
}

/**
 * Validate an invitation by its raw token (Public endpoint)
 * @param {string} rawToken
 * @returns {Promise<object>}
 */
export async function validateInvitation(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    const err = new AppError('Invitation token is required', 400);
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  const tokenHash = hashInvitationToken(rawToken);
  const invitation = await invitationRepository.findByTokenHash(tokenHash);

  if (!invitation) {
    const err = new AppError('Invitation not found or invalid', 404);
    err.code = 'INVITATION_NOT_FOUND';
    throw err;
  }

  const status = getInvitationStatus(invitation);

  if (status === 'Accepted') {
    const err = new AppError('This invitation has already been accepted', 400);
    err.code = 'INVITATION_ALREADY_ACCEPTED';
    throw err;
  }

  if (status === 'Revoked') {
    const err = new AppError('This invitation has been revoked', 400);
    err.code = 'INVITATION_REVOKED';
    throw err;
  }

  if (status === 'Expired') {
    const err = new AppError('This invitation has expired', 400);
    err.code = 'INVITATION_EXPIRED';
    throw err;
  }

  return {
    id: invitation.id,
    workspaceId: invitation.workspaceId,
    workspaceName: invitation.workspace?.name || 'Workspace',
    workspaceDescription: invitation.workspace?.description || null,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    status: 'Pending',
    invitedBy: invitation.invitedBy
      ? {
          name: invitation.invitedBy.name,
          email: invitation.invitedBy.email,
        }
      : null,
  };
}

/**
 * Accept an invitation transactionally
 * @param {object} params
 * @param {string} params.rawToken
 * @param {object} params.currentUser - Authenticated user { id, email }
 * @returns {Promise<object>}
 */
export async function acceptInvitation({ rawToken, currentUser }) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError('Invitation token is required', 400);
  }

  if (!currentUser || !currentUser.id || !currentUser.email) {
    throw new AppError('Authentication required to accept invitation', 401);
  }

  const tokenHash = hashInvitationToken(rawToken);
  const invitation = await invitationRepository.findByTokenHash(tokenHash);

  if (!invitation) {
    const err = new AppError('Invitation not found or invalid', 404);
    err.code = 'INVITATION_NOT_FOUND';
    throw err;
  }

  const status = getInvitationStatus(invitation);

  if (status === 'Accepted') {
    const err = new AppError('This invitation has already been accepted', 400);
    err.code = 'INVITATION_ALREADY_ACCEPTED';
    throw err;
  }

  if (status === 'Revoked') {
    const err = new AppError('This invitation has been revoked', 400);
    err.code = 'INVITATION_REVOKED';
    throw err;
  }

  if (status === 'Expired') {
    const err = new AppError('This invitation has expired', 400);
    err.code = 'INVITATION_EXPIRED';
    throw err;
  }

  // Strict email match validation
  const userEmail = currentUser.email.trim().toLowerCase();
  const invitedEmail = invitation.email.trim().toLowerCase();

  if (userEmail !== invitedEmail) {
    const err = new AppError(
      `This invitation was sent to a different email address (${invitation.email}). You are signed in as ${currentUser.email}.`,
      403
    );
    err.code = 'INVITATION_EMAIL_MISMATCH';
    throw err;
  }

  // Atomically create membership and mark invitation accepted
  const { member } = await invitationRepository.acceptTransactionally({
    invitationId: invitation.id,
    workspaceId: invitation.workspaceId,
    userId: currentUser.id,
    role: invitation.role,
  });

  return {
    success: true,
    workspaceId: invitation.workspaceId,
    workspaceName: invitation.workspace?.name || 'Workspace',
    role: member.role,
    membershipId: member.id,
  };
}

export default {
  getInvitationStatus,
  hashInvitationToken,
  formatInvitation,
  createInvitation,
  listInvitations,
  revokeInvitation,
  validateInvitation,
  acceptInvitation,
};
