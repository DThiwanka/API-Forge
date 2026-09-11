import requestService from '../services/requests/request.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new request definition
 * POST /api/workspaces/:workspaceId/collections/:collectionId/requests
 */
export const create = asyncHandler(async (req, res) => {
  const request = await requestService.createRequest({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    requestData: req.body,
  });

  res.status(201).json({
    success: true,
    message: 'Request created successfully',
    data: {
      request,
    },
  });
});

/**
 * List all requests for a collection, optionally filtered by folder
 * GET /api/workspaces/:workspaceId/collections/:collectionId/requests
 */
export const list = asyncHandler(async (req, res) => {
  const { folderId } = req.query;
  const requests = await requestService.listRequests({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    folderId,
  });

  res.status(200).json({
    success: true,
    data: {
      requests,
    },
  });
});

/**
 * Get request by ID
 * GET /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId
 */
export const getById = asyncHandler(async (req, res) => {
  const request = await requestService.getRequest({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    requestId: req.params.requestId,
  });

  res.status(200).json({
    success: true,
    data: {
      request,
    },
  });
});

/**
 * Update request definition
 * PATCH /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId
 */
export const update = asyncHandler(async (req, res) => {
  const request = await requestService.updateRequest({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    requestId: req.params.requestId,
    updateData: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Request updated successfully',
    data: {
      request,
    },
  });
});

/**
 * Delete a request definition
 * DELETE /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId
 */
export const deleteRequest = asyncHandler(async (req, res) => {
  await requestService.deleteRequest({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    requestId: req.params.requestId,
  });

  res.status(200).json({
    success: true,
    message: 'Request deleted successfully',
  });
});

/**
 * Duplicate a request definition
 * POST /api/workspaces/:workspaceId/collections/:collectionId/requests/:requestId/duplicate
 */
export const duplicate = asyncHandler(async (req, res) => {
  const request = await requestService.duplicateRequest({
    workspaceId: req.workspace.id,
    collectionId: req.collection.id,
    requestId: req.params.requestId,
  });

  res.status(201).json({
    success: true,
    message: 'Request duplicated successfully',
    data: {
      request,
    },
  });
});

export default {
  create,
  list,
  getById,
  update,
  deleteRequest,
  duplicate,
};

