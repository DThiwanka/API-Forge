import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { collectionExportService } from '../services/import-export/collection-export.service.js';
import { curlExportService } from '../services/import-export/curl-export.service.js';

export const exportController = {
  exportCollection: asyncHandler(async (req, res) => {
    const data = await collectionExportService.exportCollection(req.params.id);
    return ApiResponse.success(res, data);
  }),

  exportCurl: asyncHandler(async (req, res) => {
    const curl = await curlExportService.toCurl(req.body.request);
    return ApiResponse.success(res, { curl });
  }),
};

export default exportController;
