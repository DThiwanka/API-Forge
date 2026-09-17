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

export async function getTabNetworkActivity(workspaceId, sessionId, tabId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/browser/sessions/${sessionId}/tabs/${tabId}/network`
  );
  return response.data?.data?.events || [];
}

export async function clearTabNetworkActivity(workspaceId, sessionId, tabId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/browser/sessions/${sessionId}/tabs/${tabId}/network`
  );
  return response.data?.data;
}

export function createNetworkEventSource(workspaceId, sessionId, tabId, onEvent) {
  if (typeof EventSource === 'undefined') return null;
  const baseUrl = apiClient.defaults?.baseURL || 'http://localhost:5000/api';
  const url = `${baseUrl}/workspaces/${workspaceId}/browser/sessions/${sessionId}/network/stream?tabId=${encodeURIComponent(tabId)}`;

  try {
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('network_request', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent?.({ type: 'request', data });
      } catch {
        // Ignore JSON parse errors
      }
    });

    es.addEventListener('network_response', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent?.({ type: 'response', data });
      } catch {
        // Ignore JSON parse errors
      }
    });

    es.addEventListener('network_failed', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent?.({ type: 'failed', data });
      } catch {
        // Ignore JSON parse errors
      }
    });

    es.addEventListener('network_clear', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent?.({ type: 'clear', data });
      } catch {
        // Ignore
      }
    });

    return es;
  } catch {
    return null;
  }
}

export async function getCapturedRequestImportPreview(workspaceId, sessionId, eventId) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/browser/sessions/${sessionId}/network/${eventId}/import-preview`
  );
  return response.data?.data;
}

export default {
  createBrowserSession,
  getBrowserSessions,
  getBrowserSession,
  closeBrowserSession,
  createBrowserTab,
  closeBrowserTab,
  navigateBrowserTab,
  getTabNetworkActivity,
  clearTabNetworkActivity,
  createNetworkEventSource,
  getCapturedRequestImportPreview,
};

