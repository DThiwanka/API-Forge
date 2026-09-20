import { create } from 'zustand';
import apiClient from '../../../lib/apiClient.js';

const STORAGE_KEY = 'apiforge_user';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const initialUser = getStoredUser();

export const useAuthStore = create((set, get) => ({
  user: initialUser,
  isAuthenticated: Boolean(initialUser),
  isInitialized: false,
  isLoading: false,

  setAuth: (user) => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
    set({
      user,
      isAuthenticated: Boolean(user),
      isInitialized: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    set({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // First attempt: check current session with /auth/me
      const meRes = await apiClient.get('/auth/me');
      const user = meRes.data?.data?.user;
      if (user) {
        get().setAuth(user);
        return user;
      }
    } catch (err) {
      // If 401 (e.g. access token expired), attempt session refresh with /auth/refresh
      if (err.response?.status === 401) {
        try {
          const refreshRes = await apiClient.post('/auth/refresh');
          const refreshedUser = refreshRes.data?.data?.user;
          if (refreshedUser) {
            get().setAuth(refreshedUser);
            return refreshedUser;
          }
        } catch {
          // Refresh failed — user session is expired or invalid
          get().clearAuth();
          return null;
        }
      } else if (!err.response) {
        // Network error / server offline: maintain optimistic state if available
        set({ isInitialized: true, isLoading: false });
        return get().user;
      }
    }

    get().clearAuth();
    return null;
  },
}));

export default useAuthStore;
