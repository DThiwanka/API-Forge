import { useState } from 'react';
import responseStore from '../store/responseStore';

export function useResponse() {
  const [response, setResponse] = useState(responseStore.getResponse());
  return { response, setResponse };
}

export default useResponse;
