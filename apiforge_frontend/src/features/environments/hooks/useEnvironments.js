import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listEnvironments,
  getEnvironment,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  activateEnvironment,
  listVariables,
  createVariable,
  updateVariable,
  deleteVariable,
} from '../services/environmentApi';

export function useEnvironmentsQuery(workspaceId) {
  return useQuery({
    queryKey: ['environments', workspaceId],
    queryFn: () => listEnvironments(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

export function useEnvironmentQuery(workspaceId, environmentId) {
  return useQuery({
    queryKey: ['environment', workspaceId, environmentId],
    queryFn: () => getEnvironment(workspaceId, environmentId),
    enabled: Boolean(workspaceId && environmentId),
    staleTime: 30000,
  });
}

export function useVariablesQuery(workspaceId, environmentId) {
  return useQuery({
    queryKey: ['variables', workspaceId, environmentId],
    queryFn: () => listVariables(workspaceId, environmentId),
    enabled: Boolean(workspaceId && environmentId),
    staleTime: 30000,
  });
}

export function useCreateEnvironmentMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createEnvironment(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['environments', workspaceId],
      });
    },
  });
}

export function useUpdateEnvironmentMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ environmentId, ...payload }) =>
      updateEnvironment(workspaceId, environmentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['environments', workspaceId],
      });
      if (variables?.environmentId) {
        queryClient.invalidateQueries({
          queryKey: ['environment', workspaceId, variables.environmentId],
        });
      }
    },
  });
}

export function useDeleteEnvironmentMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (environmentId) => deleteEnvironment(workspaceId, environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['environments', workspaceId],
      });
    },
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

export function useCreateVariableMutation(workspaceId, environmentId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => createVariable(workspaceId, environmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['variables', workspaceId, environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['environments', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['environment', workspaceId, environmentId],
      });
    },
  });
}

export function useUpdateVariableMutation(workspaceId, environmentId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variableId, ...payload }) =>
      updateVariable(workspaceId, environmentId, variableId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['variables', workspaceId, environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['environment', workspaceId, environmentId],
      });
    },
  });
}

export function useDeleteVariableMutation(workspaceId, environmentId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variableId) => deleteVariable(workspaceId, environmentId, variableId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['variables', workspaceId, environmentId],
      });
      queryClient.invalidateQueries({
        queryKey: ['environments', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['environment', workspaceId, environmentId],
      });
    },
  });
}

export default {
  useEnvironmentsQuery,
  useEnvironmentQuery,
  useVariablesQuery,
  useCreateEnvironmentMutation,
  useUpdateEnvironmentMutation,
  useDeleteEnvironmentMutation,
  useActivateEnvironmentMutation,
  useCreateVariableMutation,
  useUpdateVariableMutation,
  useDeleteVariableMutation,
};
