import { apiClient } from '../../../lib/apiClient';

export const historyApi = {
  getAll: async () => apiClient.get('/history'),
  clear: async () => apiClient.delete('/history'),
};

export default historyApi;
