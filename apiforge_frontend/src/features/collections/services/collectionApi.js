import { apiClient } from '../../../lib/apiClient';

export const collectionApi = {
  getAll: async () => apiClient.get('/collections'),
  getById: async (id) => apiClient.get(`/collections/${id}`),
  create: async (data) => apiClient.post('/collections', data),
  delete: async (id) => apiClient.delete(`/collections/${id}`),
};

export default collectionApi;
