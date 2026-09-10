import { useState, useEffect } from 'react';
import historyApi from '../services/historyApi';

export function useHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    historyApi.getAll().then((res) => setHistory(res?.data || []));
  }, []);

  return { history, setHistory };
}

export default useHistory;
