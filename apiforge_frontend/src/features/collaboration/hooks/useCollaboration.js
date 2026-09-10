import { useState } from 'react';

export function useCollaboration() {
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  return { activeCollaborators, setActiveCollaborators };
}

export default useCollaboration;
