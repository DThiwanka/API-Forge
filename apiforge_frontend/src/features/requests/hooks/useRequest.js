import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRequest,
  updateRequest,
  createRequest,
  deleteRequest,
  duplicateRequest,
} from '../services/requestApi';
import useRequestStore from '../store/requestStore';
import useRequestTabStore from '../store/requestTabStore';
import useCanvasStore from '../../canvas/store/canvasStore';

export function useRequestQuery(workspaceId, collectionId, requestId) {
  const loadRequest = useRequestStore((s) => s.loadRequest);

  return useQuery({
    queryKey: ['request', workspaceId, collectionId, requestId],
    queryFn: async () => {
      const data = await getRequest(workspaceId, collectionId, requestId);
      loadRequest(data, workspaceId, collectionId);
      return data;
    },
    enabled: Boolean(workspaceId && collectionId && requestId),
    staleTime: 30000,
  });
}

export function useUpdateRequestMutation(workspaceId, collectionId, requestId) {
  const queryClient = useQueryClient();
  const markClean = useRequestStore((s) => s.markClean);
  const setIsSaving = useRequestStore((s) => s.setIsSaving);

  return useMutation({
    mutationFn: async (payload) => {
      setIsSaving(true);
      try {
        const updated = await updateRequest(workspaceId, collectionId, requestId, payload);
        return updated;
      } finally {
        setIsSaving(false);
      }
    },
    onSuccess: (updated) => {
      markClean();
      queryClient.setQueryData(['request', workspaceId, collectionId, requestId], updated);
      queryClient.invalidateQueries({
        queryKey: ['requests', workspaceId, collectionId],
      });

      // Synchronize open Tab metadata if tab exists
      if (workspaceId && requestId && updated) {
        useRequestTabStore.getState().updateTabMeta(workspaceId, requestId, {
          title: updated.name,
          method: updated.method,
          url: updated.url,
        });

        // Synchronize Canvas Node if node exists on Canvas
        useCanvasStore.getState().updateNodeData(requestId, {
          name: updated.name,
          method: updated.method,
          url: updated.url,
          folderId: updated.folderId,
        });
      }
    },
  });
}

export function useCreateRequestMutation(workspaceId, collectionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestData) => createRequest(workspaceId, collectionId, requestData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['requests', workspaceId, collectionId],
      });
    },
  });
}

export function useDeleteRequestMutation(workspaceId, collectionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId) => deleteRequest(workspaceId, collectionId, requestId),
    onSuccess: () => {
    onSuccess: (_, deletedRequestId) => {
      queryClient.invalidateQueries({
        queryKey: ['requests', workspaceId, collectionId],
      });

      // Synchronize Tab Store: close the deleted tab
      if (workspaceId && deletedRequestId) {
        useRequestTabStore.getState().closeTab(workspaceId, deletedRequestId);
        // Synchronize Canvas Store: remove the node
        useCanvasStore.getState().removeNodeFromCanvas(deletedRequestId);
      }
    },
  });
}

export function useDuplicateRequestMutation(workspaceId, collectionId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId) => duplicateRequest(workspaceId, collectionId, requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['requests', workspaceId, collectionId],
      });
    },
  });
}

export default {
  useRequestQuery,
  useUpdateRequestMutation,
  useCreateRequestMutation,
  useDeleteRequestMutation,
  useDuplicateRequestMutation,
};
