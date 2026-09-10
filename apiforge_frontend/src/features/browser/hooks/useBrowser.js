import { useState } from 'react';
import browserStore from '../store/browserStore';

export function useBrowser() {
  const [capturedRequests, setCapturedRequests] = useState(browserStore.getRequests());
  return { capturedRequests, setCapturedRequests };
}

export default useBrowser;
