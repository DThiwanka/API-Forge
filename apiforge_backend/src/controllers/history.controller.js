import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { historyService } from '../services/history/history.service.js';

export const historyController = {
  getAll: asyncHandler(async (req, res) => {
    const history = await historyService.getAll(req.user.id);
    return ApiResponse.success(res, history);
  }),

  clear: asyncHandler(async (req, res) => {
    await historyService.clear(req.user.id);
    return ApiResponse.success(res, null, 'History cleared');
  }),

  delete: asyncHandler(async (req, res) => {
    await historyService.delete(req.params.id);
    return ApiResponse.success(res, null, 'History item deleted');
  }),
};

export default historyController;
