import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { browserService } from '../services/browser/browser.service.js';

export const browserController = {
  getNetworkLogs: asyncHandler(async (req, res) => {
    const logs = await browserService.getNetworkLogs();
    return ApiResponse.success(res, logs);
  }),

  createSession: asyncHandler(async (req, res) => {
    const session = await browserService.createSession(req.body);
    return ApiResponse.created(res, session, 'Browser session initialized');
  }),
};

export default browserController;
