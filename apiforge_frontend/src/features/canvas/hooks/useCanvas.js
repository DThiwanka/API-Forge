import { useState, useCallback } from 'react';

export function useCanvas() {
  const [nodes, setNodes] = useState([]);
  const [zoom, setZoom] = useState(1);

  const addNode = useCallback((node) => {
    setNodes((prev) => [...prev, node]);
  }, []);

  return { nodes, zoom, setZoom, addNode };
}

export default useCanvas;
