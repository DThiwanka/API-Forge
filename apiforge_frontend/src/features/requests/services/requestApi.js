import apiClient from '../../../lib/apiClient';

/**
 * Get request definition by ID
 */
export async function getRequest(workspaceId, collectionId, requestId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/collections/${collectionId}/requests/${requestId}`
  );
  return response.data.data.request;
}

/**
 * Update request definition
 */
export async function updateRequest(workspaceId, collectionId, requestId, updateData) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/collections/${collectionId}/requests/${requestId}`,
    updateData
  );
  return response.data.data.request;
}

/**
 * Execute request definition via the backend execution engine
 */
export async function executeRequest(workspaceId, collectionId, requestId, payload = {}) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/collections/${collectionId}/requests/${requestId}/execute`,
    payload
  );
  return response.data.data;
}

/**
 * List requests for a collection, optionally filtered by folderId
 */
export async function listRequests(workspaceId, collectionId, folderId) {
  const params = folderId !== undefined ? { folderId } : {};
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/collections/${collectionId}/requests`,
    { params }
  );
  return response.data.data.requests;
}

/**
 * Create a new request in a collection
 */
export async function createRequest(workspaceId, collectionId, requestData) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/collections/${collectionId}/requests`,
    requestData
  );
  return response.data.data.request;
}

export default {
  getRequest,
  updateRequest,
  executeRequest,
  listRequests,
  createRequest,
};

