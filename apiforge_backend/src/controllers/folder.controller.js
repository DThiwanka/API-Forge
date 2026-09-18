import folderService from '../services/collections/folder.service.js';
import realtimeService from '../services/realtime/realtime.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new folder in a collection
 * POST /api/workspaces/:workspaceId/collections/:collectionId/folders
 */
export const create = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const folder = await folderService.createFolder({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    parentId,
    name,
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(req.workspace.id, {
    type: 'folder.created',
    workspaceId: req.workspace.id,
    resourceId: folder.id,
    actor: req.user,
    metadata: {
      collectionId: req.collection.id,
      name: folder.name,
      parentId: folder.parentId,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: {
      folder,
    },
  });
});

/**
 * List all folders for a collection
 * GET /api/workspaces/:workspaceId/collections/:collectionId/folders
 */
export const list = asyncHandler(async (req, res) => {
  const asTree = req.query.tree === 'true';
  const folders = await folderService.listFolders({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    asTree,
  });

  res.status(200).json({
    success: true,
    data: {
      folders,
    },
  });
});

/**
 * Get folder by ID
 * GET /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId
 */
export const getById = asyncHandler(async (req, res) => {
  const folder = await folderService.getFolder({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    folderId: req.params.folderId,
  });

  res.status(200).json({
    success: true,
    data: {
      folder,
    },
  });
});

/**
 * Update folder metadata
 * PATCH /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId
 */
export const update = asyncHandler(async (req, res) => {
  const { name, parentId } = req.body;
  const folder = await folderService.updateFolder({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    folderId: req.params.folderId,
    updateData: {
      ...(name !== undefined && { name }),
      ...(parentId !== undefined && { parentId }),
    },
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(req.workspace.id, {
    type: 'folder.updated',
    workspaceId: req.workspace.id,
    resourceId: folder.id,
    actor: req.user,
    metadata: {
      collectionId: req.collection.id,
      name: folder.name,
      parentId: folder.parentId,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Folder updated successfully',
    data: {
      folder,
    },
  });
});

/**
 * Delete a folder
 * DELETE /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId
 */
export const deleteFolder = asyncHandler(async (req, res) => {
  await folderService.deleteFolder({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    folderId: req.params.folderId,
  });

  // Broadcast realtime event
  realtimeService.broadcastToWorkspace(req.workspace.id, {
    type: 'folder.deleted',
    workspaceId: req.workspace.id,
    resourceId: req.params.folderId,
    actor: req.user,
    metadata: {
      collectionId: req.collection.id,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Folder deleted successfully',
  });
});

export default {
  create,
  list,
  getById,
  update,
  deleteFolder,
};

