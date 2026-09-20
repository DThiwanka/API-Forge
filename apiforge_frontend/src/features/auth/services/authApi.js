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
 * Refresh access and refresh tokens using HTTP-only cookies
 * POST /api/auth/refresh
 */
export async function refreshTokens() {
  const response = await apiClient.post('/auth/refresh');
  return response.data.data;
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
  refreshTokens,
  logout,
};
