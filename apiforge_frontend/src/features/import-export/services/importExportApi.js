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

export default {
  previewCurl,
  importCurl,
  exportRequestAsCurl,
};

