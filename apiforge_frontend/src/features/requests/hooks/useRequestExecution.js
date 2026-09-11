import { useMutation } from '@tanstack/react-query';
import { executeRequest, updateRequest } from '../services/requestApi';
import useRequestStore from '../store/requestStore';
import useResponseStore from '../../response/store/responseStore';

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
      setIsExecuting(true);
      setLoading();

      try {
        // If there are unsaved edits, save them before executing
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
        setResponse(data.response);
      }
    },
    onError: (err) => {
      const responseData = err.response?.data;
      const errorObj = {
        message: responseData?.message || err.message || 'Execution failed',
        status: err.response?.status || 0,
        details: responseData?.error || null,
        response: responseData?.data?.response || null,
      };
      setError(errorObj);
    },
  });
}

export default useRequestExecution;

