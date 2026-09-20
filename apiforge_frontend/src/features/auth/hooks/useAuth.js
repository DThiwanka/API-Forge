import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/authApi';
import useAuthStore from '../store/authStore.js';

export function useCurrentUser() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const cachedUser = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const user = await getCurrentUser();
        setAuth(user);
        return user;
      } catch (err) {
        if (err.response?.status === 401) {
          clearAuth();
        }
        throw err;
      }
    },
    initialData: cachedUser || undefined,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export default {
  useCurrentUser,
  useLogoutMutation,
};
