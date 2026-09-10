import { apiClient } from '../../../lib/apiClient';

export const collaborationApi = {
  invite: async (data) => apiClient.post('/collaboration/invite', data),
  getMembers: async () => apiClient.get('/collaboration/members'),
};

export default collaborationApi;
