import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listEnvironments, activateEnvironment } from '../services/environmentApi';

export function useEnvironmentsQuery(workspaceId) {
  return useQuery({
    queryKey: ['environments', workspaceId],
    queryFn: () => listEnvironments(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

export function useActivateEnvironmentMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (environmentId) => activateEnvironment(workspaceId, environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['environments', workspaceId],
      });
    },
  });
}

export default {
  useEnvironmentsQuery,
  useActivateEnvironmentMutation,
};

