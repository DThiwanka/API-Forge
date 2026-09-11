import { useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCollectionsQuery } from '../../collections/hooks/useCollections';
import { listRequests } from '../../requests/services/requestApi';
import useCanvasStore from '../store/canvasStore';
import storage from '../../../lib/storage';
import {
  getCanvasStorageKey,
  serializeCanvas,
  deserializeCanvas,
  computeDeterministicLayout,
} from '../utils/nodeHelpers';

/**
 * Hook to query all requests across all collections in the workspace
 */
export function useAllWorkspaceRequestsQuery(workspaceId, collections = []) {
  const collectionIds = collections.map((c) => c.id).sort().join(',');

  return useQuery({
    queryKey: ['workspace-all-requests', workspaceId, collectionIds],
    queryFn: async () => {
      if (!collections.length) return [];
      const results = await Promise.all(
        collections.map(async (c) => {
          try {
            const reqs = await listRequests(workspaceId, c.id);
            return (reqs || []).map((r) => ({
              ...r,
              collectionId: c.id,
              collectionName: c.name,
            }));
          } catch {
            return [];
          }
        })
      );
      return results.flat();
    },
    enabled: Boolean(workspaceId && collections.length > 0),
    staleTime: 30000,
  });
}

export function useCanvas(workspaceId) {
  const isInitializedRef = useRef(false);
  const activeWorkspaceRef = useRef(workspaceId);

  const {
    data: collections = [],
    isLoading: loadingCollections,
    isError: collectionsError,
  } = useCollectionsQuery(workspaceId);

  const {
    data: allRequests = [],
    isLoading: loadingRequests,
    isError: requestsError,
    refetch: refetchRequests,
  } = useAllWorkspaceRequestsQuery(workspaceId, collections);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const viewport = useCanvasStore((s) => s.viewport);
  const setNodes = useCanvasStore((s) => s.setNodes);
  const setEdges = useCanvasStore((s) => s.setEdges);
  const setViewport = useCanvasStore((s) => s.setViewport);
  const resetCanvas = useCanvasStore((s) => s.resetCanvas);
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);
  const addCollectionNodes = useCanvasStore((s) => s.addCollectionNodes);

  // Save current canvas layout to local storage
  const saveLayout = useCallback(() => {
    if (!workspaceId) return;
    const currentNodes = useCanvasStore.getState().nodes;
    const currentEdges = useCanvasStore.getState().edges;
    const currentViewport = useCanvasStore.getState().viewport;

    const serialized = serializeCanvas(currentNodes, currentEdges, currentViewport);
    storage.set(getCanvasStorageKey(workspaceId), serialized);
  }, [workspaceId]);

  // Handle workspace switching: clear store and reset init flag
  useEffect(() => {
    if (activeWorkspaceRef.current !== workspaceId) {
      activeWorkspaceRef.current = workspaceId;
      isInitializedRef.current = false;
      resetCanvas();
    }
  }, [workspaceId, resetCanvas]);

  // Initial load / reconciliation
  useEffect(() => {
    if (!workspaceId || loadingCollections || loadingRequests) {
      return;
    }

    if (isInitializedRef.current) {
      // If already initialized, prune any nodes whose requests were deleted
      const availableIds = new Set(allRequests.map((r) => r.id));
      const currentNodes = useCanvasStore.getState().nodes;
      const filteredNodes = currentNodes.filter((n) => availableIds.has(n.id));

      if (filteredNodes.length !== currentNodes.length) {
        const retainedIds = new Set(filteredNodes.map((n) => n.id));
        const filteredEdges = useCanvasStore
          .getState()
          .edges.filter((e) => retainedIds.has(e.source) && retainedIds.has(e.target));
        setNodes(filteredNodes);
        setEdges(filteredEdges);
        saveLayout();
      }
      return;
    }

    // Load from local storage
    const storageKey = getCanvasStorageKey(workspaceId);
    const savedLayout = storage.get(storageKey, null);

    if (savedLayout) {
      const deserialized = deserializeCanvas(savedLayout, allRequests, collections);
      if (deserialized && Array.isArray(deserialized.nodes)) {
        setNodes(deserialized.nodes);
        setEdges(deserialized.edges);
        if (deserialized.viewport) {
          setViewport(deserialized.viewport);
        }
        isInitializedRef.current = true;
        return;
      }
    }

    // If no saved layout, start with clean canvas
    setNodes([]);
    setEdges([]);
    isInitializedRef.current = true;
  }, [
    workspaceId,
    collections,
    allRequests,
    loadingCollections,
    loadingRequests,
    setNodes,
    setEdges,
    setViewport,
    saveLayout,
  ]);

  // Auto-arrange all workspace requests in a deterministic layout
  const resetToDefaultLayout = useCallback(() => {
    if (!allRequests.length) return;
    const { nodes: newNodes } = computeDeterministicLayout(allRequests, collections);
    setNodes(newNodes);
    setEdges([]);
    saveLayout();
  }, [allRequests, collections, setNodes, setEdges, saveLayout]);

  // Add an individual request to the canvas
  const addRequest = useCallback(
    (request) => {
      const col = collections.find((c) => c.id === request.collectionId);
      const node = addRequestNode(request, col?.name || 'Collection');
      saveLayout();
      return node;
    },
    [collections, addRequestNode, saveLayout]
  );

  // Add all requests from a collection to the canvas
  const addCollection = useCallback(
    (collectionId) => {
      const col = collections.find((c) => c.id === collectionId);
      const colRequests = allRequests.filter((r) => r.collectionId === collectionId);
      if (colRequests.length > 0) {
        addCollectionNodes(colRequests, col?.name || 'Collection');
        saveLayout();
      }
    },
    [collections, allRequests, addCollectionNodes, saveLayout]
  );

  return {
    collections,
    allRequests,
    nodes,
    edges,
    viewport,
    isLoading: loadingCollections || loadingRequests,
    isError: collectionsError || requestsError,
    refetchRequests,
    saveLayout,
    resetToDefaultLayout,
    addRequest,
    addCollection,
  };
}

export default useCanvas;

