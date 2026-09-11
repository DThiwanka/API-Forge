import { useMutation } from '@tanstack/react-query';
import { runCollection } from '../services/runnerApi';

/**
 * Hook for executing a collection run mutation
 *
 * @param {string} workspaceId
 * @param {string} collectionId
 */
export function useCollectionRunnerMutation(workspaceId, collectionId) {
  return useMutation({
    mutationFn: (payload) => runCollection(workspaceId, collectionId, payload),
  });
}

export default {
  useCollectionRunnerMutation,
};

