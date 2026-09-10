import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { environmentService } from '../services/environments/environment.service.js';

export const environmentController = {
  getAll: asyncHandler(async (req, res) => {
    const envs = await environmentService.getAll(req.query.workspaceId);
    return ApiResponse.success(res, envs);
  }),

  getById: asyncHandler(async (req, res) => {
    const env = await environmentService.getById(req.params.id);
    return ApiResponse.success(res, env);
  }),

  create: asyncHandler(async (req, res) => {
    const created = await environmentService.create(req.body);
    return ApiResponse.created(res, created, 'Environment created');
  }),

  update: asyncHandler(async (req, res) => {
    const updated = await environmentService.update(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Environment updated');
  }),

  delete: asyncHandler(async (req, res) => {
    await environmentService.delete(req.params.id);
    return ApiResponse.success(res, null, 'Environment deleted');
  }),
};

export default environmentController;
