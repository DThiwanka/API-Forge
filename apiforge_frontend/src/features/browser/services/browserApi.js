import apiClient from '../../../lib/apiClient';

/**
 * Browser API Service
 * Handles communication with backend browser session endpoints
 */

export async function createBrowserSession(workspaceId) {
  const response = await apiClient.post(`/workspaces/${workspaceId}/browser/sessions`);
  return response.data?.data?.session;
}

export async function getBrowserSessions(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/browser/sessions`);
  return response.data?.data?.sessions || [];
}

export async function getBrowserSession(workspaceId, sessionId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/browser/sessions/${sessionId}`);
  return response.data?.data?.session;
}

export async function closeBrowserSession(workspaceId, sessionId) {
  const response = await apiClient.delete(`/workspaces/${workspaceId}/browser/sessions/${sessionId}`);
  return response.data?.data;
}

export async function createBrowserTab(workspaceId, sessionId, url = '') {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/browser/sessions/${sessionId}/tabs`,
    { url }
  );
  return response.data?.data?.session;
}

export async function closeBrowserTab(workspaceId, sessionId, tabId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/browser/sessions/${sessionId}/tabs/${tabId}`
  );
  return response.data?.data?.session;
}

export async function navigateBrowserTab(workspaceId, sessionId, tabId, { url, action = 'navigate' } = {}) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/browser/sessions/${sessionId}/tabs/${tabId}/navigate`,
    { url, action }
  );
  return response.data?.data?.session;
}

export default {
  createBrowserSession,
  getBrowserSessions,
  getBrowserSession,
  closeBrowserSession,
  createBrowserTab,
  closeBrowserTab,
  navigateBrowserTab,
};

