import apiClient from '../../../lib/apiClient';

/**
 * Execute collection runner sequentially on the backend
 * POST /api/workspaces/:workspaceId/collections/:collectionId/run
 *
 * @param {string} workspaceId
 * @param {string} collectionId
 * @param {object} payload
 * @param {Array<string>} [payload.requestIds]
 * @param {Array<string>} [payload.folderIds]
 * @param {string|null} [payload.environmentId]
 * @param {Record<string, any>} [payload.runtimeVariables]
 * @param {boolean} [payload.stopOnError=false]
 * @returns {Promise<object>} Run metadata, summary, and results
 */
export async function runCollection(workspaceId, collectionId, payload = {}) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/collections/${collectionId}/run`,
    payload
  );
  return response.data.data;
}

export default {
  runCollection,
};

