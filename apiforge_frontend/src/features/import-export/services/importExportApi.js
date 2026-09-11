import apiClient from '../../../lib/apiClient';

/**
 * Preview normalized request definition from a cURL command without persisting
 * POST /api/workspaces/:workspaceId/import/curl/preview
 */
export async function previewCurl(workspaceId, curl) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/import/curl/preview`,
    { curl }
  );
  return response.data.data;
}

/**
 * Import a cURL command and persist as a new request definition in a collection
 * POST /api/workspaces/:workspaceId/import/curl
 */
export async function importCurl(workspaceId, { curl, collectionId, folderId, name }) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/import/curl`,
    {
      curl,
      collectionId,
      folderId: folderId || null,
      name: name || undefined,
    }
  );
  return response.data.data.request;
}

/**
 * Export a saved request definition as an executable cURL command
 * GET /api/workspaces/:workspaceId/requests/:requestId/export/curl
 */
export async function exportRequestAsCurl(workspaceId, requestId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/requests/${requestId}/export/curl`
  );
  return response.data.data;
}

/**
 * Preview normalized import plan from an OpenAPI 3.0 / 3.1 document without persisting
 * POST /api/workspaces/:workspaceId/import/openapi/preview
 */
export async function previewOpenApi(workspaceId, document) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/import/openapi/preview`,
    { document }
  );
  return response.data.data;
}

/**
 * Import OpenAPI specification and persist resources (collection, folders, requests)
 * POST /api/workspaces/:workspaceId/import/openapi
 */
export async function importOpenApi(
  workspaceId,
  { document, collectionId, collectionName, folderId, selectedOperations }
) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/import/openapi`,
    {
      document,
      collectionId: collectionId || undefined,
      collectionName: collectionName || undefined,
      folderId: folderId || undefined,
      selectedOperations: selectedOperations || undefined,
    }
  );
  return response.data.data;
}

/**
 * Export a collection as an OpenAPI 3.0.3 specification in JSON or YAML
 * GET /api/workspaces/:workspaceId/collections/:collectionId/export/openapi?format=json|yaml
 */
export async function exportOpenApi(workspaceId, collectionId, format = 'json') {
  const normalizedFormat = format?.toLowerCase() === 'yaml' ? 'yaml' : 'json';
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/collections/${collectionId}/export/openapi`,
    {
      params: { format: normalizedFormat },
      responseType: 'text',
      transformResponse: [(data) => data],
    }
  );

  let filename = '';
  const disposition =
    response.headers?.['content-disposition'] ||
    response.headers?.get?.('content-disposition');
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  return {
    content: response.data,
    filename: filename || `collection.openapi.${normalizedFormat}`,
    format: normalizedFormat,
    contentType:
      response.headers?.['content-type'] ||
      (normalizedFormat === 'yaml' ? 'application/yaml' : 'application/json'),
  };
}

export default {
  previewCurl,
  importCurl,
  exportRequestAsCurl,
  previewOpenApi,
  importOpenApi,
  exportOpenApi,
};


