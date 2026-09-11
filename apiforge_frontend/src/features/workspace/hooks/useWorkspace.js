import { useQuery } from '@tanstack/react-query';
import { listWorkspaces, getWorkspace, listCollections, listFolders } from '../services/workspaceApi';

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
  useCollectionsQuery,
  useFoldersQuery,
};

