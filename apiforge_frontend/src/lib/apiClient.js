const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = {
  async get(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, { credentials: 'omit', ...options });
    return res.json();
  },
  async post(endpoint, data, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(data),
      ...options,
    });
    return res.json();
  },
  async put(endpoint, data, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify(data),
      ...options,
    });
    return res.json();
  },
  async delete(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      ...options,
    });
    return res.json();
  },
};

export default apiClient;
