import { useState, useCallback } from 'react';
import requestApi from '../services/requestApi';

export function useRequestExecution() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const execute = useCallback(async (config) => {
    setLoading(true);
    try {
      const res = await requestApi.execute(config);
      setResponse(res);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  return { execute, loading, response };
}

export default useRequestExecution;
