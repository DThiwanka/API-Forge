import apiClient from '../../../lib/apiClient';

/**
 * List tests for a request in a workspace
 * GET /api/workspaces/:workspaceId/requests/:requestId/tests
 */
export async function listTests(workspaceId, requestId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/requests/${requestId}/tests`
  );
  return response.data.data.tests;
}

/**
 * Get single test by ID
 * GET /api/workspaces/:workspaceId/requests/:requestId/tests/:testId
 */
export async function getTest(workspaceId, requestId, testId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}`
  );
  return response.data.data.test;
}

/**
 * Create a new test definition
 * POST /api/workspaces/:workspaceId/requests/:requestId/tests
 */
export async function createTest(workspaceId, requestId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/requests/${requestId}/tests`,
    payload
  );
  return response.data.data.test;
}

/**
 * Update test definition
 * PATCH /api/workspaces/:workspaceId/requests/:requestId/tests/:testId
 */
export async function updateTest(workspaceId, requestId, testId, payload) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}`,
    payload
  );
  return response.data.data.test;
}

/**
 * Delete a test definition
 * DELETE /api/workspaces/:workspaceId/requests/:requestId/tests/:testId
 */
export async function deleteTest(workspaceId, requestId, testId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}`
  );
  return response.data;
}

/**
 * Run a test and evaluate its assertions
 * POST /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/run
 */
export async function runTest(workspaceId, requestId, testId, payload = {}) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}/run`,
    payload
  );
  return response.data.data;
}

/**
 * Create an assertion for a test
 * POST /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions
 */
export async function createAssertion(workspaceId, requestId, testId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}/assertions`,
    payload
  );
  return response.data.data.assertion;
}

/**
 * Update an assertion definition
 * PATCH /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions/:assertionId
 */
export async function updateAssertion(workspaceId, requestId, testId, assertionId, payload) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}/assertions/${assertionId}`,
    payload
  );
  return response.data.data.assertion;
}

/**
 * Delete an assertion
 * DELETE /api/workspaces/:workspaceId/requests/:requestId/tests/:testId/assertions/:assertionId
 */
export async function deleteAssertion(workspaceId, requestId, testId, assertionId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/requests/${requestId}/tests/${testId}/assertions/${assertionId}`
  );
  return response.data;
}

export default {
  listTests,
  getTest,
  createTest,
  updateTest,
  deleteTest,
  runTest,
  createAssertion,
  updateAssertion,
  deleteAssertion,
};

