import { apiClient } from '../../../lib/apiClient';

export const importExportApi = {
  importSpec: async (data) => apiClient.post('/import', data),
  exportSpec: async (collectionId) => apiClient.get(`/export/${collectionId}`),
};

export default importExportApi;
