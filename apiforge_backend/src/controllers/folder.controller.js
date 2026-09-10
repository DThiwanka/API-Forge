import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { folderService } from '../services/collections/folder.service.js';

export const folderController = {
  create: asyncHandler(async (req, res) => {
    const folder = await folderService.create(req.body);
    return ApiResponse.created(res, folder, 'Folder created');
  }),

  getById: asyncHandler(async (req, res) => {
    const folder = await folderService.getById(req.params.id);
    return ApiResponse.success(res, folder);
  }),

  update: asyncHandler(async (req, res) => {
    const updated = await folderService.update(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Folder updated');
  }),

  delete: asyncHandler(async (req, res) => {
    await folderService.delete(req.params.id);
    return ApiResponse.success(res, null, 'Folder deleted');
  }),
};

export default folderController;
