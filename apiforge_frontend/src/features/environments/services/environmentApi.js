import { apiClient } from '../../../lib/apiClient';

export const environmentApi = {
  getAll: async () => apiClient.get('/environments'),
  create: async (data) => apiClient.post('/environments', data),
  update: async (id, data) => apiClient.put(`/environments/${id}`, data),
  delete: async (id) => apiClient.delete(`/environments/${id}`),
};

export default environmentApi;
