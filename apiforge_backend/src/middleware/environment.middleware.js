import environmentRepository from '../repositories/environment.repository.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to verify that requested environment exists and belongs to active workspace context.
 * Attaches req.environment to the request.
 */
export const requireEnvironment = asyncHandler(async (req, res, next) => {
  const { environmentId } = req.params;
  if (!environmentId) {
    throw new AppError('Environment ID parameter is required', 400);
  }

  const workspaceId = req.workspace ? req.workspace.id : req.params.workspaceId;
  if (!workspaceId) {
    throw new AppError('Workspace context is required', 400);
  }

  const environment = await environmentRepository.findByWorkspaceAndId(workspaceId, environmentId);
  if (!environment) {
    throw new AppError('Environment not found in this workspace', 404);
  }

  req.environment = environment;
  next();
});

export default {
  requireEnvironment,
};

