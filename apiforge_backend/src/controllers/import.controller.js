import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { curlImportService } from '../services/import-export/curl-import.service.js';
import { openapiImportService } from '../services/import-export/openapi-import.service.js';

export const importController = {
  importCurl: asyncHandler(async (req, res) => {
    const request = await curlImportService.importCurl(req.body.command);
    return ApiResponse.success(res, request, 'cURL imported');
  }),

  importOpenApi: asyncHandler(async (req, res) => {
    const collection = await openapiImportService.importSpec(req.body.spec);
    return ApiResponse.success(res, collection, 'OpenAPI imported');
  }),
};

export default importController;
