import { apiClient } from '../../../lib/apiClient';

export const authApi = {
  login: async (credentials) => apiClient.post('/auth/login', credentials),
  register: async (userData) => apiClient.post('/auth/register', userData),
  getCurrentUser: async () => apiClient.get('/auth/me'),
  logout: async () => apiClient.post('/auth/logout'),
};

export default authApi;
