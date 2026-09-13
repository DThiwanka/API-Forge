import { useMutation } from '@tanstack/react-query';
import { executeRequest, updateRequest } from '../services/requestApi';
import useRequestStore from '../store/requestStore';
import useResponseStore from '../../response/store/responseStore';
import { classifyClientExecutionError } from '../utils/executionUtils';

/**
 * Hook to manage the request execution lifecycle
 * 
 * Synchronizes store states across request and response stores,
 * manages dirty state preservation, handles execution errors with classification,
 * and guards against concurrent duplicate runs.
 */
export function useRequestExecution(workspaceId, collectionId, requestId) {
  const getCleanPayload = useRequestStore((s) => s.getCleanPayload);
  const isDirty = useRequestStore((s) => s.isDirty);
  const markClean = useRequestStore((s) => s.markClean);
  const setIsExecuting = useRequestStore((s) => s.setIsExecuting);
  const setLoading = useResponseStore((s) => s.setLoading);
  const setResponse = useResponseStore((s) => s.setResponse);
  const setError = useResponseStore((s) => s.setError);

  return useMutation({
    mutationFn: async (runtimeVariables = {}) => {
      // Guard against concurrent execution on the active request
      if (useRequestStore.getState().isExecuting) {
        return;
      }

      setIsExecuting(true);
      setLoading(requestId);

      try {
        // If there are unsaved edits, save them before executing so backend runs current draft
        if (isDirty) {
          const payload = getCleanPayload();
          await updateRequest(workspaceId, collectionId, requestId, payload);
          markClean();
        }

        const data = await executeRequest(workspaceId, collectionId, requestId, {
          variables: runtimeVariables,
        });

        return data;
      } finally {
        setIsExecuting(false);
      }
    },
    onSuccess: (data) => {
      if (data?.response) {
        setResponse(requestId, data.response);
      }
    },
    onError: (err) => {
      const classified = classifyClientExecutionError(err);
      const responseData = err.response?.data;

      const errorObj = {
        type: classified.type,
        title: classified.title,
        message: classified.message,
        status: classified.status,
        suggestions: classified.suggestions,
        details: responseData?.error || null,
        response: responseData?.data?.response || null,
      };

      setError(requestId, errorObj);
    },
  });
}

export default useRequestExecution;
