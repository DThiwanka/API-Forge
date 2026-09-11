import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from '../services/collectionApi';

export function useCollectionsQuery(workspaceId) {
  return useQuery({
    queryKey: ['collections', workspaceId],
    queryFn: () => listCollections(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30000,
  });
}

export function useCreateCollectionMutation(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createCollection(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
    },
  });
}

export function useUpdateCollectionMutation(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, ...payload }) =>
      updateCollection(workspaceId, collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
    },
  });
}

export function useDeleteCollectionMutation(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId) => deleteCollection(workspaceId, collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
    },
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

export function useCreateFolderMutation(workspaceId, collectionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createFolder(workspaceId, collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId, collectionId] });
    },
  });
}

export function useUpdateFolderMutation(workspaceId, collectionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, ...payload }) =>
      updateFolder(workspaceId, collectionId, folderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId, collectionId] });
    },
  });
}

export function useDeleteFolderMutation(workspaceId, collectionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId) => deleteFolder(workspaceId, collectionId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId, collectionId] });
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId, collectionId] });
    },
  });
}

export default {
  useCollectionsQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
  useDeleteCollectionMutation,
  useFoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
};

