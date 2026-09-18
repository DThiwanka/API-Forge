import memberService from '../services/collaboration/member.service.js';
import invitationService from '../services/collaboration/invitation.service.js';
import realtimeService from '../services/realtime/realtime.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * List all members in the workspace
 */
export const listMembers = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const members = await memberService.listMembers(workspaceId);

  res.status(200).json({
    status: 'success',
    data: { members },
  });
});

/**
 * Update a member's role in the workspace
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const { workspaceId, memberId } = req.params;
  const { role } = req.body;

  const member = await memberService.updateMemberRole({
    workspaceId,
    memberId,
    newRole: role,
    actorUserId: req.user.id,
    actorRole: req.workspaceMember.role,
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(workspaceId, {
    type: 'member.updated',
    workspaceId,
    resourceId: member.id,
    actor: req.user,
    metadata: {
      userId: member.userId,
      newRole: member.role,
    },
  });

  res.status(200).json({
    status: 'success',
    data: { member },
  });
});

/**
 * Remove a member from the workspace
 */
export const removeMember = asyncHandler(async (req, res) => {
  const { workspaceId, memberId } = req.params;

  const result = await memberService.removeMember({
    workspaceId,
    memberId,
    actorUserId: req.user.id,
    actorRole: req.workspaceMember.role,
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(workspaceId, {
    type: 'member.removed',
    workspaceId,
    resourceId: memberId,
    actor: req.user,
    metadata: {
      userId: result.removedUserId,
    },
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * List all invitations for the workspace
 */
export const listInvitations = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const invitations = await invitationService.listInvitations(workspaceId);

  res.status(200).json({
    status: 'success',
    data: { invitations },
  });
});

/**
 * Create a new workspace invitation
 */
export const createInvitation = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { email, role } = req.body;

  const result = await invitationService.createInvitation({
    workspaceId,
    email,
    role,
    inviterUserId: req.user.id,
    inviterRole: req.workspaceMember.role,
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(workspaceId, {
    type: 'invitation.created',
    workspaceId,
    resourceId: result.invitation?.id,
    actor: req.user,
    metadata: {
      email: result.invitation?.email,
      role: result.invitation?.role,
    },
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});

/**
 * Revoke an existing invitation
 */
export const revokeInvitation = asyncHandler(async (req, res) => {
  const { workspaceId, invitationId } = req.params;

  const invitation = await invitationService.revokeInvitation({
    workspaceId,
    invitationId,
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(workspaceId, {
    type: 'invitation.revoked',
    workspaceId,
    resourceId: invitationId,
    actor: req.user,
  });

  res.status(200).json({
    status: 'success',
    data: { invitation },
  });
});

/**
 * Validate an invitation token (Public)
 */
export const validateInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const invitation = await invitationService.validateInvitation(token);

  res.status(200).json({
    status: 'success',
    data: { invitation },
  });
});

/**
 * Accept an invitation token (Authenticated)
 */
export const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const result = await invitationService.acceptInvitation({
    rawToken: token,
    currentUser: req.user,
  });

  // Broadcast realtime event to workspace
  if (result.workspaceId) {
    realtimeService.broadcastToWorkspace(result.workspaceId, {
      type: 'member.added',
      workspaceId: result.workspaceId,
      resourceId: result.membership?.id,
      actor: req.user,
      metadata: {
        userId: req.user.id,
        role: result.membership?.role,
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export default {
  listMembers,
  updateMemberRole,
  removeMember,
  listInvitations,
  createInvitation,
  revokeInvitation,
  validateInvitation,
  acceptInvitation,
};

