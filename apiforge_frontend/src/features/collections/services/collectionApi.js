import apiClient from '../../../lib/apiClient';

/**
 * List collections in a workspace
 * GET /api/workspaces/:workspaceId/collections
 */
export async function listCollections(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/collections`);
  return response.data.data.collections;
}

/**
 * Get collection by ID
 * GET /api/workspaces/:workspaceId/collections/:collectionId
 */
export async function getCollection(workspaceId, collectionId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/collections/${collectionId}`);
  return response.data.data.collection;
}

/**
 * Create a new collection
 * POST /api/workspaces/:workspaceId/collections
 */
export async function createCollection(workspaceId, payload) {
  const response = await apiClient.post(`/workspaces/${workspaceId}/collections`, payload);
  return response.data.data.collection;
}

/**
 * Update collection metadata
 * PATCH /api/workspaces/:workspaceId/collections/:collectionId
 */
export async function updateCollection(workspaceId, collectionId, payload) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/collections/${collectionId}`,
    payload
  );
  return response.data.data.collection;
}

/**
 * Delete a collection
 * DELETE /api/workspaces/:workspaceId/collections/:collectionId
 */
export async function deleteCollection(workspaceId, collectionId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/collections/${collectionId}`
  );
  return response.data;
}

/**
 * List folders in a collection
 * GET /api/workspaces/:workspaceId/collections/:collectionId/folders
 */
export async function listFolders(workspaceId, collectionId, asTree = true) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/collections/${collectionId}/folders`,
    { params: { tree: asTree ? 'true' : 'false' } }
  );
  return response.data.data.folders;
}

/**
 * Get folder by ID
 * GET /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId
 */
export async function getFolder(workspaceId, collectionId, folderId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/collections/${collectionId}/folders/${folderId}`
  );
  return response.data.data.folder;
}

/**
 * Create a new folder
 * POST /api/workspaces/:workspaceId/collections/:collectionId/folders
 */
export async function createFolder(workspaceId, collectionId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/collections/${collectionId}/folders`,
    payload
  );
  return response.data.data.folder;
}

/**
 * Update folder metadata or parentId
 * PATCH /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId
 */
export async function updateFolder(workspaceId, collectionId, folderId, payload) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/collections/${collectionId}/folders/${folderId}`,
    payload
  );
  return response.data.data.folder;
}

/**
 * Delete a folder
 * DELETE /api/workspaces/:workspaceId/collections/:collectionId/folders/:folderId
 */
export async function deleteFolder(workspaceId, collectionId, folderId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/collections/${collectionId}/folders/${folderId}`
  );
  return response.data;
}

export default {
  listCollections,
  getCollection,
  createCollection,
  updateCollection,
  deleteCollection,
  listFolders,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
};

