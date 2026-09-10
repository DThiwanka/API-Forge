import { useState, useCallback } from 'react';
import authStore from '../store/authStore';

export function useAuth() {
  const [state, setState] = useState(authStore.getState());

  const login = useCallback(async (credentials) => {
    return authStore.login(credentials);
  }, []);

  const logout = useCallback(() => {
    authStore.logout();
  }, []);

  return { ...state, login, logout };
}

export default useAuth;
