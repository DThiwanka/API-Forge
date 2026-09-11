import collectionService, {
  formatCollectionResponse,
} from '../services/collections/collection.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new collection
 * POST /api/workspaces/:workspaceId/collections
 */
export const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const collection = await collectionService.createCollection({
    workspaceId: req.workspace.id,
    name,
    description,
  });

  res.status(201).json({
    success: true,
    message: 'Collection created successfully',
    data: {
      collection,
    },
  });
});

/**
 * List all collections for a workspace
 * GET /api/workspaces/:workspaceId/collections
 */
export const list = asyncHandler(async (req, res) => {
  const collections = await collectionService.listCollections(req.workspace.id);

  res.status(200).json({
    success: true,
    data: {
      collections,
    },
  });
});

/**
 * Get collection by ID
 * GET /api/workspaces/:workspaceId/collections/:collectionId
 */
export const getById = asyncHandler(async (req, res) => {
  const collection = formatCollectionResponse(req.collection);

  res.status(200).json({
    success: true,
    data: {
      collection,
    },
  });
});

/**
 * Update collection metadata
 * PATCH /api/workspaces/:workspaceId/collections/:collectionId
 */
export const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const collection = await collectionService.updateCollection({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    updateData: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
  });

  res.status(200).json({
    success: true,
    message: 'Collection updated successfully',
    data: {
      collection,
    },
  });
});

/**
 * Delete a collection
 * DELETE /api/workspaces/:workspaceId/collections/:collectionId
 */
export const deleteCollection = asyncHandler(async (req, res) => {
  await collectionService.deleteCollection({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
  });

  res.status(200).json({
    success: true,
    message: 'Collection deleted successfully',
  });
});

export default {
  create,
  list,
  getById,
  update,
  deleteCollection,
};

