import apiClient from '../../../lib/apiClient';

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data.data.user;
}

/**
 * Logout current user and clear auth cookies
 * POST /api/auth/logout
 */
export async function logout() {
  const response = await apiClient.post('/auth/logout');
  return response.data;
}

export default {
  getCurrentUser,
  logout,
};

