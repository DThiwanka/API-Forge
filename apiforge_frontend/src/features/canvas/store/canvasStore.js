import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { requestToNode, arrangeNodesLayout } from '../utils/nodeHelpers.js';

export const useCanvasStore = create((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  focusNodeId: null,
  searchQuery: '',
  isRequestPickerOpen: false,
  contextMenu: { isOpen: false, x: 0, y: 0, node: null },
  paneContextMenu: { isOpen: false, x: 0, y: 0 },
  clipboardNodeRefs: [],

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
  setFocusNodeId: (focusNodeId) => set({ focusNodeId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  openRequestPicker: () => set({ isRequestPickerOpen: true }),
  closeRequestPicker: () => set({ isRequestPickerOpen: false }),

  openContextMenu: ({ x, y, node }) =>
    set({
      contextMenu: { isOpen: true, x, y, node },
      paneContextMenu: { isOpen: false, x: 0, y: 0 },
    }),

  closeContextMenu: () =>
    set({
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
    }),

  openPaneContextMenu: ({ x, y }) =>
    set({
      paneContextMenu: { isOpen: true, x, y },
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
    }),

  closePaneContextMenu: () =>
    set({
      paneContextMenu: { isOpen: false, x: 0, y: 0 },
    }),

  selectAllNodes: () => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) => ({ ...n, selected: true })),
      selectedNodeId: nodes.length > 0 ? nodes[0].id : null,
    });
  },

  clearSelection: () => {
    const { nodes } = get();
    set({
      nodes: nodes.map((n) => ({ ...n, selected: false })),
      selectedNodeId: null,
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
      paneContextMenu: { isOpen: false, x: 0, y: 0 },
    });
  },

  deleteSelectedNodes: () => {
    const { nodes, edges, selectedNodeId } = get();
    const toDeleteIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id)
    );
    if (selectedNodeId) {
      toDeleteIds.add(selectedNodeId);
    }

    if (toDeleteIds.size === 0) return;

    set({
      nodes: nodes.filter((n) => !toDeleteIds.has(n.id)),
      edges: edges.filter(
        (e) => !toDeleteIds.has(e.source) && !toDeleteIds.has(e.target)
      ),
      selectedNodeId: null,
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
      paneContextMenu: { isOpen: false, x: 0, y: 0 },
    });
  },

  arrangeNodes: (collections = []) => {
    const { nodes } = get();
    if (nodes.length === 0) return;
    const arranged = arrangeNodesLayout(nodes, collections);
    set({ nodes: arranged });
  },

  copySelectedNodeRefs: () => {
    const { nodes, selectedNodeId } = get();
    const selected = nodes.filter((n) => n.selected);
    const ids = selected.length > 0
      ? selected.map((n) => n.id)
      : selectedNodeId ? [selectedNodeId] : [];
    set({ clipboardNodeRefs: ids });
  },

  addRequestNode: (request, collectionName = 'Collection', folderName = null) => {
    const existing = get().nodes.find((n) => n.id === request.id);
    if (existing) {
      // Duplicate protection: select and focus existing node
      set({
        selectedNodeId: existing.id,
        focusNodeId: existing.id,
        nodes: get().nodes.map((n) => ({
          ...n,
          selected: n.id === existing.id,
        })),
      });
      return { ...existing, isDuplicate: true };
    }

    // Smart placement: find an open position near existing nodes
    const currentNodes = get().nodes;
    const count = currentNodes.length;
    const colsPerRow = 3;
    const col = count % colsPerRow;
    const row = Math.floor(count / colsPerRow);
    const x = 120 + col * 320;
    const y = 100 + row * 160;

    const newNode = requestToNode(request, { x, y }, collectionName, folderName);
    set({
      nodes: [...currentNodes.map((n) => ({ ...n, selected: false })), { ...newNode, selected: true }],
      selectedNodeId: newNode.id,
      focusNodeId: newNode.id,
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
      return requestToNode(req, { x, y }, collectionName, req.folderName);
    });

    set({
      nodes: [...currentNodes, ...addedNodes],
    });
  },

  updateNodeData: (nodeId, partialData) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id === nodeId) {
          const updatedData = { ...node.data, ...partialData };
          // If name changed, also update breadcrumb if needed
          if (partialData.collectionName || partialData.folderName) {
            const cName = partialData.collectionName || node.data.collectionName || 'Collection';
            const fName = partialData.folderName !== undefined ? partialData.folderName : node.data.folderName;
            updatedData.breadcrumb = fName ? `${cName} / ${fName}` : cName;
          }
          return {
            ...node,
            data: updatedData,
          };
        }
        return node;
      }),
    }));
  },

  removeNodeFromCanvas: (nodeId) => {
    const { nodes, edges } = get();
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
      paneContextMenu: { isOpen: false, x: 0, y: 0 },
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
      focusNodeId: null,
      searchQuery: '',
      isRequestPickerOpen: false,
      contextMenu: { isOpen: false, x: 0, y: 0, node: null },
      paneContextMenu: { isOpen: false, x: 0, y: 0 },
      clipboardNodeRefs: [],
    });
  },
}));

export default useCanvasStore;
