import apiClient from '../../../lib/apiClient';

/**
 * List environments for a workspace
 * GET /api/workspaces/:workspaceId/environments
 */
export async function listEnvironments(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/environments`);
  return response.data.data.environments;
}

/**
 * Get environment by ID with its variables
 * GET /api/workspaces/:workspaceId/environments/:environmentId
 */
export async function getEnvironment(workspaceId, environmentId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/environments/${environmentId}`
  );
  return response.data.data.environment;
}

/**
 * Create a new environment
 * POST /api/workspaces/:workspaceId/environments
 */
export async function createEnvironment(workspaceId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/environments`,
    payload
  );
  return response.data.data.environment;
}

/**
 * Update environment metadata
 * PATCH /api/workspaces/:workspaceId/environments/:environmentId
 */
export async function updateEnvironment(workspaceId, environmentId, payload) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/environments/${environmentId}`,
    payload
  );
  return response.data.data.environment;
}

/**
 * Delete environment
 * DELETE /api/workspaces/:workspaceId/environments/:environmentId
 */
export async function deleteEnvironment(workspaceId, environmentId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/environments/${environmentId}`
  );
  return response.data;
}

/**
 * Activate an environment
 * POST /api/workspaces/:workspaceId/environments/:environmentId/activate
 */
export async function activateEnvironment(workspaceId, environmentId) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/environments/${environmentId}/activate`
  );
  return response.data.data.environment;
}

/**
 * List all variables for an environment
 * GET /api/workspaces/:workspaceId/environments/:environmentId/variables
 */
export async function listVariables(workspaceId, environmentId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/environments/${environmentId}/variables`
  );
  return response.data.data.variables;
}

/**
 * Get single variable by ID
 * GET /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId
 */
export async function getVariable(workspaceId, environmentId, variableId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/environments/${environmentId}/variables/${variableId}`
  );
  return response.data.data.variable;
}

/**
 * Create a variable in an environment
 * POST /api/workspaces/:workspaceId/environments/:environmentId/variables
 */
export async function createVariable(workspaceId, environmentId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/environments/${environmentId}/variables`,
    payload
  );
  return response.data.data.variable;
}

/**
 * Update variable definition
 * PATCH /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId
 */
export async function updateVariable(workspaceId, environmentId, variableId, payload) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/environments/${environmentId}/variables/${variableId}`,
    payload
  );
  return response.data.data.variable;
}

/**
 * Delete variable
 * DELETE /api/workspaces/:workspaceId/environments/:environmentId/variables/:variableId
 */
export async function deleteVariable(workspaceId, environmentId, variableId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/environments/${environmentId}/variables/${variableId}`
  );
  return response.data;
}

export default {
  listEnvironments,
  getEnvironment,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  listVariables,
  getVariable,
  createVariable,
  updateVariable,
  deleteVariable,
};
