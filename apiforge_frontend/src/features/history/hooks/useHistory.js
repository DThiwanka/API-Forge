import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  listHistory,
  getHistoryById,
  deleteHistoryItem,
  clearHistory,
} from '../services/historyApi';

export const historyKeys = {
  all: ['history'],
  workspace: (workspaceId) => ['history', workspaceId],
  list: (workspaceId, filters) => ['history', workspaceId, 'list', filters],
  detail: (workspaceId, historyId) => ['history', workspaceId, 'detail', historyId],
};

/**
 * Hook to query paginated execution history with filters
 * 
 * @param {string} workspaceId 
 * @param {object} [filters={}] 
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useHistoryQuery(workspaceId, filters = {}) {
  return useQuery({
    queryKey: historyKeys.list(workspaceId, filters),
    queryFn: () => listHistory(workspaceId, filters),
    enabled: Boolean(workspaceId),
    placeholderData: keepPreviousData,
    staleTime: 10000,
  });
}

/**
 * Hook to query a single execution history entry
 * 
 * @param {string} workspaceId 
 * @param {string} historyId 
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useHistoryItemQuery(workspaceId, historyId) {
  return useQuery({
    queryKey: historyKeys.detail(workspaceId, historyId),
    queryFn: () => getHistoryById(workspaceId, historyId),
    enabled: Boolean(workspaceId && historyId),
    staleTime: 30000,
  });
}

/**
 * Mutation to delete an individual execution history record
 * 
 * @param {string} workspaceId 
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useDeleteHistoryItemMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (historyId) => deleteHistoryItem(workspaceId, historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: historyKeys.workspace(workspaceId),
      });
    },
  });
}

/**
 * Mutation to clear execution history for a workspace
 * 
 * @param {string} workspaceId 
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useClearHistoryMutation(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => clearHistory(workspaceId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: historyKeys.workspace(workspaceId),
      });
    },
  });
}

export default {
  historyKeys,
  useHistoryQuery,
  useHistoryItemQuery,
  useDeleteHistoryItemMutation,
  useClearHistoryMutation,
};

