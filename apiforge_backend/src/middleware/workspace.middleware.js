import workspaceRepository from '../repositories/workspace.repository.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to ensure the authenticated user belongs to the requested workspace.
 * Attaches req.workspace and req.workspaceMember to the request.
 */
export const requireWorkspaceMember = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    throw new AppError('Authentication required', 401);
  }

  const { workspaceId } = req.params;
  if (!workspaceId) {
    throw new AppError('Workspace ID parameter is required', 400);
  }

  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) {
    throw new AppError('Workspace not found', 404);
  }

  const membership = await workspaceRepository.findMembership(workspaceId, req.user.id);
  if (!membership) {
    throw new AppError('Access denied: You are not a member of this workspace', 403);
  }

  req.workspace = workspace;
  req.workspaceMember = membership;

  next();
});

export default {
  requireWorkspaceMember,
};

