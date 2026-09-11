import apiClient from '../../../lib/apiClient';

/**
 * List environments for a workspace
 * @param {string} workspaceId
 * @returns {Promise<Array<object>>}
 */
export async function listEnvironments(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/environments`);
  return response.data.data.environments;
}

/**
 * Get environment by ID with its variables
 * @param {string} workspaceId
 * @param {string} environmentId
 * @returns {Promise<object>}
 */
export async function getEnvironment(workspaceId, environmentId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/environments/${environmentId}`
  );
  return response.data.data.environment;
}

/**
 * Activate an environment
 * @param {string} workspaceId
 * @param {string} environmentId
 * @returns {Promise<object>}
 */
export async function activateEnvironment(workspaceId, environmentId) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/environments/${environmentId}/activate`
  );
  return response.data.data.environment;
}

export default {
  listEnvironments,
  getEnvironment,
  activateEnvironment,
};

