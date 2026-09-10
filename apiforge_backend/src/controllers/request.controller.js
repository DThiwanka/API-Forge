import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { requestService } from '../services/requests/request.service.js';
import { requestExecutionService } from '../services/execution/request-execution.service.js';

export const requestController = {
  getAll: asyncHandler(async (req, res) => {
    const requests = await requestService.getAll(req.query.collectionId);
    return ApiResponse.success(res, requests);
  }),

  getById: asyncHandler(async (req, res) => {
    const request = await requestService.getById(req.params.id);
    return ApiResponse.success(res, request);
  }),

  create: asyncHandler(async (req, res) => {
    const created = await requestService.create(req.body, req.user.id);
    return ApiResponse.created(res, created, 'Request created');
  }),

  execute: asyncHandler(async (req, res) => {
    const result = await requestExecutionService.execute(req.body, req.user.id);
    return ApiResponse.success(res, result, 'Request executed');
  }),

  update: asyncHandler(async (req, res) => {
    const updated = await requestService.update(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Request updated');
  }),

  delete: asyncHandler(async (req, res) => {
    await requestService.delete(req.params.id);
    return ApiResponse.success(res, null, 'Request deleted');
  }),
};

export default requestController;
