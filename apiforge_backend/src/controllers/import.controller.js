import { parseCurlCommand } from '../services/import-export/curl-import.service.js';
import openapiImportService from '../services/import-export/openapi-import.service.js';
import requestService from '../services/requests/request.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Preview normalized request definition from cURL command without saving
 * POST /api/workspaces/:workspaceId/import/curl/preview
 */
export const previewCurl = asyncHandler(async (req, res) => {
  const { curl } = req.body;
  const parsed = parseCurlCommand(curl);

  res.status(200).json({
    success: true,
    data: parsed,
  });
});

/**
 * Import cURL command and persist as a new saved request definition
 * POST /api/workspaces/:workspaceId/import/curl
 */
export const importCurl = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { curl, collectionId, folderId, name } = req.body;

  const parsed = parseCurlCommand(curl);

  const request = await requestService.createRequest({
    workspaceId,
    collectionId,
    requestData: {
      ...parsed,
      name: name || parsed.name,
      folderId: folderId || null,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Request imported successfully',
    data: {
      request,
    },
  });
});

/**
 * Preview normalized import plan from OpenAPI document without persisting
 * POST /api/workspaces/:workspaceId/import/openapi/preview
 */
export const previewOpenApi = asyncHandler(async (req, res) => {
  const { document } = req.body;
  const plan = await openapiImportService.generateImportPlan(document);

  res.status(200).json({
    success: true,
    data: plan,
  });
});

/**
 * Import OpenAPI specification and persist resources inside a transaction
 * POST /api/workspaces/:workspaceId/import/openapi
 */
export const importOpenApi = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const { document, collectionId, collectionName, folderId, selectedOperations } = req.body;

  const result = await openapiImportService.importOpenApi({
    workspaceId,
    document,
    collectionId,
    collectionName,
    folderId,
    selectedOperations,
  });

  res.status(201).json({
    success: true,
    message: 'OpenAPI specification imported successfully',
    data: result,
  });
});

export default {
  previewCurl,
  importCurl,
  previewOpenApi,
  importOpenApi,
};


