import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { requestToNode } from '../utils/nodeHelpers.js';

export const useCanvasStore = create((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  searchQuery: '',
  isRequestPickerOpen: false,
  contextMenu: { isOpen: false, x: 0, y: 0, node: null },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    // Reject self connections
    if (connection.source === connection.target) {
      return;
    }

    set({
      edges: addEdge(
        {
          ...connection,
          id: `e-${connection.source}-${connection.target}`,
          animated: false,
          style: { stroke: '#475569', strokeWidth: 1.5 },
        },
        get().edges
      ),
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  openRequestPicker: () => set({ isRequestPickerOpen: true }),
  closeRequestPicker: () => set({ isRequestPickerOpen: false }),

  openContextMenu: ({ x, y, node }) =>
    set({
      contextMenu: { isOpen: true, x, y, node },
    }),

  closeContextMenu: () =>
    set({
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
    }),

  addRequestNode: (request, collectionName = 'Collection') => {
    const existing = get().nodes.find((n) => n.id === request.id);
    if (existing) {
      set({ selectedNodeId: existing.id });
      return existing;
    }

    // Smart placement: find an open position
    const currentNodes = get().nodes;
    const count = currentNodes.length;
    const colsPerRow = 3;
    const col = count % colsPerRow;
    const row = Math.floor(count / colsPerRow);
    const x = 120 + col * 320;
    const y = 100 + row * 160;

    const newNode = requestToNode(request, { x, y }, collectionName);
    set({
      nodes: [...currentNodes, newNode],
      selectedNodeId: newNode.id,
    });
    return newNode;
  },

  addCollectionNodes: (requests = [], collectionName = 'Collection') => {
    const currentNodes = get().nodes;
    const existingIds = new Set(currentNodes.map((n) => n.id));

    const newRequests = requests.filter((r) => !existingIds.has(r.id));
    if (newRequests.length === 0) return;

    let count = currentNodes.length;
    const colsPerRow = 3;
    const addedNodes = newRequests.map((req) => {
      const col = count % colsPerRow;
      const row = Math.floor(count / colsPerRow);
      const x = 120 + col * 320;
      const y = 100 + row * 160;
      count += 1;
      return requestToNode(req, { x, y }, collectionName);
    });

    set({
      nodes: [...currentNodes, ...addedNodes],
    });
  },

  removeNodeFromCanvas: (nodeId) => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
    });
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
    });
  },

  resetCanvas: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      searchQuery: '',
      isRequestPickerOpen: false,
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
    });
  },
}));

export default useCanvasStore;

