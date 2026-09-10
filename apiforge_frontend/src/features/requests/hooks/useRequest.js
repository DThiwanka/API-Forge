import { useState } from 'react';
import requestStore from '../store/requestStore';

export function useRequest() {
  const [request, setRequest] = useState(requestStore.getActiveRequest());
  return { request, setRequest };
}

export default useRequest;
