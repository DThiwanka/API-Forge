import { apiClient } from '../../../lib/apiClient';

export const requestApi = {
  execute: async (config) => apiClient.post('/requests/execute', config),
  save: async (request) => apiClient.post('/requests', request),
  getHistory: async () => apiClient.get('/requests/history'),
};

export default requestApi;
