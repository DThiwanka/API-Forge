import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { testService } from '../services/testing/test.service.js';

export const testingController = {
  runTests: asyncHandler(async (req, res) => {
    const results = await testService.run(req.body);
    return ApiResponse.success(res, results, 'Tests completed');
  }),

  getTestsByRequestId: asyncHandler(async (req, res) => {
    const tests = await testService.getByRequestId(req.params.requestId);
    return ApiResponse.success(res, tests);
  }),
};

export default testingController;
