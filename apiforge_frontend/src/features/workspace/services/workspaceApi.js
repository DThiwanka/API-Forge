import apiClient from '../../../lib/apiClient';

/**
 * List all workspaces the user has access to
 * @returns {Promise<Array<object>>}
 */
export async function listWorkspaces() {
  const response = await apiClient.get('/workspaces');
  return response.data.data.workspaces;
}

/**
 * Get workspace details
 * @param {string} workspaceId
 * @returns {Promise<object>}
 */
export async function getWorkspace(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}`);
  return response.data.data.workspace;
}

/**
 * Create a new workspace
 * @param {object} payload - { name, description }
 * @returns {Promise<object>}
 */
export async function createWorkspace(payload) {
  const response = await apiClient.post('/workspaces', payload);
  return response.data.data.workspace;
}

/**
 * Update workspace metadata
 * @param {string} workspaceId
 * @param {object} payload - { name, description }
 * @returns {Promise<object>}
 */
export async function updateWorkspace(workspaceId, payload) {
  const response = await apiClient.patch(`/workspaces/${workspaceId}`, payload);
  return response.data.data.workspace;
}

/**
 * Delete a workspace
 * @param {string} workspaceId
 * @returns {Promise<object>}
 */
export async function deleteWorkspace(workspaceId) {
  const response = await apiClient.delete(`/workspaces/${workspaceId}`);
  return response.data;
}

/**
 * List collections in a workspace
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function listCollections(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/collections`);
  return response.data.data.collections;
}

/**
 * List folders in a collection
 * @param {string} workspaceId
 * @param {string} collectionId
 * @param {boolean} asTree
 * @returns {Promise<Array<object>>}
 */
export async function listFolders(workspaceId, collectionId, asTree = true) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/collections/${collectionId}/folders`,
    { params: { tree: asTree ? 'true' : 'false' } }
  );
  return response.data.data.folders;
}

export default {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listCollections,
  listFolders,
};
