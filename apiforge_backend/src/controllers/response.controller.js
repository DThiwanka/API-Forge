import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const responseController = {
  getById: asyncHandler(async (req, res) => {
    return ApiResponse.success(res, { id: req.params.id, status: 200, data: {} });
  }),
};

export default responseController;
