import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listCollections,
  listFolders,
} from '../services/workspaceApi';

export function useWorkspacesQuery() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
    staleTime: 60000,
  });
}

export function useWorkspaceQuery(workspaceId) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => getWorkspace(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60000,
  });
}

export function useCreateWorkspaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdateWorkspaceMutation(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updateWorkspace(workspaceId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['workspace', workspaceId], updated);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useDeleteWorkspaceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useCollectionsQuery(workspaceId) {
  return useQuery({
    queryKey: ['collections', workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

export function useFoldersQuery(workspaceId, collectionId) {
  return useQuery({
    queryKey: ['folders', workspaceId, collectionId],
    queryFn: () => listFolders(workspaceId, collectionId, true),
    enabled: Boolean(workspaceId && collectionId),
    staleTime: 30000,
  });
}

export default {
  useWorkspacesQuery,
  useWorkspaceQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useCollectionsQuery,
  useFoldersQuery,
};
