import apiClient from '../../../lib/apiClient';

/**
 * List execution history records for a workspace
 * GET /api/workspaces/:workspaceId/history
 * 
 * @param {string} workspaceId 
 * @param {object} [params={}] - Query filters (page, limit, requestId, method, status, search, success)
 * @returns {Promise<{ history: Array<object>, pagination: object }>}
 */
export async function listHistory(workspaceId, params = {}) {
  const cleanParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      cleanParams[k] = v;
    }
  }

  const response = await apiClient.get(`/workspaces/${workspaceId}/history`, {
    params: cleanParams,
  });
  return response.data.data;
}

/**
 * Get a single execution history record by ID
 * GET /api/workspaces/:workspaceId/history/:historyId
 * 
 * @param {string} workspaceId 
 * @param {string} historyId 
 * @returns {Promise<object>}
 */
export async function getHistoryById(workspaceId, historyId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/history/${historyId}`
  );
  return response.data.data.history;
}

/**
 * Delete a single execution history record
 * DELETE /api/workspaces/:workspaceId/history/:historyId
 * 
 * @param {string} workspaceId 
 * @param {string} historyId 
 * @returns {Promise<object>}
 */
export async function deleteHistoryItem(workspaceId, historyId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/history/${historyId}`
  );
  return response.data;
}

/**
 * Clear execution history for a workspace
 * DELETE /api/workspaces/:workspaceId/history
 * 
 * @param {string} workspaceId 
 * @param {object} [params={}] - Optional filters like { requestId }
 * @returns {Promise<object>}
 */
export async function clearHistory(workspaceId, params = {}) {
  const response = await apiClient.delete(`/workspaces/${workspaceId}/history`, {
    params,
  });
  return response.data;
}

export default {
  listHistory,
  getHistoryById,
  deleteHistoryItem,
  clearHistory,
};

