import { apiClient } from '../../../lib/apiClient';

export const browserApi = {
  getNetworkLogs: async () => apiClient.get('/browser/network'),
};

export default browserApi;
