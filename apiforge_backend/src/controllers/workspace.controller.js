import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { workspaceService } from '../services/workspace/workspace.service.js';

export const workspaceController = {
  getAll: asyncHandler(async (req, res) => {
    const workspaces = await workspaceService.getAll(req.user.id);
    return ApiResponse.success(res, workspaces);
  }),

  getById: asyncHandler(async (req, res) => {
    const workspace = await workspaceService.getById(req.params.id, req.user.id);
    return ApiResponse.success(res, workspace);
  }),

  create: asyncHandler(async (req, res) => {
    const workspace = await workspaceService.create(req.body, req.user.id);
    return ApiResponse.created(res, workspace, 'Workspace created');
  }),

  update: asyncHandler(async (req, res) => {
    const updated = await workspaceService.update(req.params.id, req.body, req.user.id);
    return ApiResponse.success(res, updated, 'Workspace updated');
  }),

  delete: asyncHandler(async (req, res) => {
    await workspaceService.delete(req.params.id, req.user.id);
    return ApiResponse.success(res, null, 'Workspace deleted');
  }),
};

export default workspaceController;
