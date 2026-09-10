import { useState } from 'react';
import workspaceStore from '../store/workspaceStore';

export function useWorkspace() {
  const [currentWorkspace, setCurrentWorkspace] = useState(workspaceStore.getCurrentWorkspace());
  return { currentWorkspace, setCurrentWorkspace };
}

export default useWorkspace;
