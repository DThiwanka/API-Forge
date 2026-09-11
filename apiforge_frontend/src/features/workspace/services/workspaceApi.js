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
  listCollections,
  listFolders,
};

