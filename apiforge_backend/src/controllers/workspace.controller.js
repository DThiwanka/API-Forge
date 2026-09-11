import workspaceService, { formatWorkspaceResponse } from '../services/workspace/workspace.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Create a new workspace
 * POST /api/workspaces
 */
export const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const workspace = await workspaceService.createWorkspace({
    name,
    description,
    userId: req.user.id,
  });

  res.status(201).json({
    success: true,
    message: 'Workspace created successfully',
    data: {
      workspace,
    },
  });
});

/**
 * List all workspaces the authenticated user belongs to
 * GET /api/workspaces
 */
export const list = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listUserWorkspaces(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      workspaces,
    },
  });
});

/**
 * Get single workspace details
 * GET /api/workspaces/:workspaceId
 */
export const getById = asyncHandler(async (req, res) => {
  const workspace = formatWorkspaceResponse(req.workspace, req.workspaceMember.role);

  res.status(200).json({
    success: true,
    data: {
      workspace,
    },
  });
});

/**
 * Update workspace metadata
 * PATCH /api/workspaces/:workspaceId
 */
export const update = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const workspace = await workspaceService.updateWorkspace({
    workspaceId: req.workspace.id,
    updateData: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    },
    userRole: req.workspaceMember.role,
  });

  res.status(200).json({
    success: true,
    message: 'Workspace updated successfully',
    data: {
      workspace,
    },
  });
});

/**
 * Delete a workspace
 * DELETE /api/workspaces/:workspaceId
 */
export const deleteWorkspace = asyncHandler(async (req, res) => {
  await workspaceService.deleteWorkspace({
    workspaceId: req.workspace.id,
    userRole: req.workspaceMember.role,
  });

  res.status(200).json({
    success: true,
    message: 'Workspace deleted successfully',
  });
});

export default {
  create,
  list,
  getById,
  update,
  deleteWorkspace,
};

