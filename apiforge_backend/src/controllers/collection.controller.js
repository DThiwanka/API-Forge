import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { collectionService } from '../services/collections/collection.service.js';

export const collectionController = {
  getAll: asyncHandler(async (req, res) => {
    const collections = await collectionService.getAll(req.query.workspaceId);
    return ApiResponse.success(res, collections);
  }),

  getById: asyncHandler(async (req, res) => {
    const collection = await collectionService.getById(req.params.id);
    return ApiResponse.success(res, collection);
  }),

  create: asyncHandler(async (req, res) => {
    const collection = await collectionService.create(req.body);
    return ApiResponse.created(res, collection, 'Collection created');
  }),

  update: asyncHandler(async (req, res) => {
    const updated = await collectionService.update(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Collection updated');
  }),

  delete: asyncHandler(async (req, res) => {
    await collectionService.delete(req.params.id);
    return ApiResponse.success(res, null, 'Collection deleted');
  }),
};

export default collectionController;
