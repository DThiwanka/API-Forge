import collectionRepository from '../repositories/collection.repository.js';
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to verify that the requested collection exists and belongs to the active workspace.
 * Attaches req.collection to the request.
 */
export const requireCollection = asyncHandler(async (req, res, next) => {
  const { collectionId } = req.params;
  if (!collectionId) {
    throw new AppError('Collection ID parameter is required', 400);
  }

  const workspaceId = req.workspace ? req.workspace.id : req.params.workspaceId;
  if (!workspaceId) {
    throw new AppError('Workspace context is required', 400);
  }

  const collection = await collectionRepository.findByWorkspaceAndId(workspaceId, collectionId);
  if (!collection) {
    throw new AppError('Collection not found in this workspace', 404);
  }

  req.collection = collection;
  next();
});

export default {
  requireCollection,
};

