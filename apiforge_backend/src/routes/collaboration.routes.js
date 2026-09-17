import { Router } from 'express';
import collaborationController from '../controllers/collaboration.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireWorkspaceRole } from '../middleware/permission.middleware.js';
import {
  validateCreateInvitation,
  validateUpdateMemberRole,
} from '../validators/collaboration.validator.js';
import { invitationRateLimit } from '../middleware/invitation-rate-limit.middleware.js';
import { WORKSPACE_ROLES } from '../constants/workspaceRoles.js';

// Router for workspace members: mounted under /workspaces/:workspaceId/members
export const memberRouter = Router({ mergeParams: true });

memberRouter.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.VIEWER),
  collaborationController.listMembers
);

memberRouter.patch(
  '/:memberId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  validateUpdateMemberRole,
  collaborationController.updateMemberRole
);

memberRouter.delete(
  '/:memberId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  collaborationController.removeMember
);

// Router for workspace invitations: mounted under /workspaces/:workspaceId/invitations
export const workspaceInvitationRouter = Router({ mergeParams: true });

workspaceInvitationRouter.get(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  collaborationController.listInvitations
);

workspaceInvitationRouter.post(
  '/',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  invitationRateLimit(),
  validateCreateInvitation,
  collaborationController.createInvitation
);

workspaceInvitationRouter.delete(
  '/:invitationId',
  requireWorkspaceRole(WORKSPACE_ROLES.ADMIN),
  collaborationController.revokeInvitation
);

// Public/authenticated router for tokens: mounted under /invitations
export const tokenInvitationRouter = Router();

tokenInvitationRouter.get(
  '/:token/validate',
  collaborationController.validateInvitation
);

tokenInvitationRouter.post(
  '/:token/accept',
  authenticate,
  collaborationController.acceptInvitation
);

export default {
  memberRouter,
  workspaceInvitationRouter,
  tokenInvitationRouter,
};

