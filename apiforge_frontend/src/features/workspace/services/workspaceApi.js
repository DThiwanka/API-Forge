import { apiClient } from '../../../lib/apiClient';

export const workspaceApi = {
  getAll: async () => apiClient.get('/workspaces'),
  getById: async (id) => apiClient.get(`/workspaces/${id}`),
  create: async (data) => apiClient.post('/workspaces', data),
  update: async (id, data) => apiClient.put(`/workspaces/${id}`, data),
  delete: async (id) => apiClient.delete(`/workspaces/${id}`),
};

export default workspaceApi;
