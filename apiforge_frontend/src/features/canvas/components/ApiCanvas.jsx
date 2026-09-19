import { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import RequestNode from './RequestNode';
import CollectionNode from './CollectionNode';
import CanvasToolbar from './CanvasToolbar';
import CanvasControls from './CanvasControls';
import CanvasMiniMap from './CanvasMiniMap';
import NodeContextMenu from './NodeContextMenu';
import CanvasPaneContextMenu from './CanvasPaneContextMenu';
import CanvasSelectionToolbar from './CanvasSelectionToolbar';
import RequestPickerModal from './RequestPickerModal';
import RelationshipEdge from './RelationshipEdge';
import CanvasLegend from './CanvasLegend';
import RelationshipDetailsModal from './RelationshipDetailsModal';
import useCanvasStore from '../store/canvasStore';
import useCanvasShortcuts from '../hooks/useCanvasShortcuts';
import { useCanvas } from '../hooks/useCanvas';
import { inferRelationships, filterEdges } from '../utils/relationshipAnalyzer';
import { Network, Plus, Layers, Loader2, RefreshCw } from 'lucide-react';

const NODE_TYPES = {
  requestNode: RequestNode,
  collectionNode: CollectionNode,
};

const EDGE_TYPES = {
  relationship: RelationshipEdge,
};

function ApiCanvasInternal({ workspaceId }) {
  const { fitView, setCenter } = useReactFlow();

  const {
    collections,
    allRequests,
    nodes,
    edges,
    isLoading,
    isError,
    refetchRequests,
    saveLayout,
    resetToDefaultLayout,
    addRequest,
    addCollection,
  } = useCanvas(workspaceId);

  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const focusNodeId = useCanvasStore((s) => s.focusNodeId);
  const setFocusNodeId = useCanvasStore((s) => s.setFocusNodeId);
  const closeContextMenu = useCanvasStore((s) => s.closeContextMenu);
  const openPaneContextMenu = useCanvasStore((s) => s.openPaneContextMenu);
  const closePaneContextMenu = useCanvasStore((s) => s.closePaneContextMenu);
  const isRequestPickerOpen = useCanvasStore((s) => s.isRequestPickerOpen);
  const openRequestPicker = useCanvasStore((s) => s.openRequestPicker);
  const closeRequestPicker = useCanvasStore((s) => s.closeRequestPicker);

  // Step 48: API Relationship & Dependency Visualization
  const relationshipFilter = useCanvasStore((s) => s.relationshipFilter);
  const inferredTypeFilters = useCanvasStore((s) => s.inferredTypeFilters);
  const isLegendOpen = useCanvasStore((s) => s.isLegendOpen);
  const toggleLegend = useCanvasStore((s) => s.toggleLegend);
  const setSelectedRelationship = useCanvasStore((s) => s.setSelectedRelationship);

  // Infer relationships dynamically from existing canvas nodes
  // Step 48 & 61: Infer relationships dynamically based only on metadata, ignoring position/drag coordinates
  const nodesMetadataKey = useMemo(() => {
    return (nodes || [])
      .map((n) => `${n.id}:${n.data?.url || ''}:${n.data?.method || ''}:${n.data?.name || ''}`)
      .join('|');
  }, [nodes]);

  const inferredEdges = useMemo(() => {
    if (relationshipFilter === 'none' || relationshipFilter === 'explicit') {
      return [];
    }
    return inferRelationships(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesMetadataKey, relationshipFilter]);

  // Combine explicit edges with inferred edges
  const combinedEdges = useMemo(() => {
    const formattedExplicit = (edges || []).map((e) => ({
      ...e,
      type: 'relationship',
      data: {
        ...e.data,
        isInferred: false,
        relationshipType: e.data?.relationshipType || 'EXPLICIT',
      },
    }));

    const explicitPairs = new Set(
      formattedExplicit.map((e) => `${e.source}->${e.target}`)
    );

    const uniqueInferred = inferredEdges.filter(
      (e) =>
        !explicitPairs.has(`${e.source}->${e.target}`) &&
        !explicitPairs.has(`${e.target}->${e.source}`)
    );

    const all = [...formattedExplicit, ...uniqueInferred];
    return filterEdges(all, relationshipFilter, inferredTypeFilters);
  }, [edges, inferredEdges, relationshipFilter, inferredTypeFilters]);

  // Keyboard shortcuts (Delete, F, Escape, Ctrl+A)
  useCanvasShortcuts({ fitView, setCenter });

  // Handle focusNodeId navigation
  useEffect(() => {
    if (focusNodeId) {
      const targetNode = nodes.find((n) => n.id === focusNodeId);
      if (targetNode) {
        setCenter(targetNode.position.x + 120, targetNode.position.y + 60, {
          zoom: 1.2,
          duration: 400,
        });
      }
      setFocusNodeId(null);
    }
  }, [focusNodeId, nodes, setCenter, setFocusNodeId]);

  const handleNodeClick = useCallback(
    (e, node) => {
      setSelectedNodeId(node.id);
      closeContextMenu();
      closePaneContextMenu();
    },
    [setSelectedNodeId, closeContextMenu, closePaneContextMenu]
  );

  const handleEdgeClick = useCallback(
    (e, edge) => {
      setSelectedRelationship(edge);
    },
    [setSelectedRelationship]
  );

  const handlePaneClick = useCallback(() => {
    closeContextMenu();
    closePaneContextMenu();
  }, [closeContextMenu, closePaneContextMenu]);

  const handlePaneContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      openPaneContextMenu({ x: e.clientX, y: e.clientY });
    },
    [openPaneContextMenu]
  );

  const handleNodeDragStop = useCallback(() => {
    saveLayout();
  }, [saveLayout]);

  const handleConnectWithSave = useCallback(
    (params) => {
      onConnect(params);
      setTimeout(saveLayout, 50);
    },
    [onConnect, saveLayout]
  );

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 400 });
  }, [fitView]);

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: '#38bdf8', strokeWidth: 1.5 },
      animated: false,
    }),
    []
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#090a0f] h-full">
        <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
        <span className="text-xs font-mono">Loading API Canvas...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#090a0f] h-full text-xs">
        <div className="text-rose-400 font-semibold mb-1">Failed to load workspace requests</div>
        <p className="text-slate-400 max-w-sm mb-4">
          There was an error fetching collections and requests for this canvas.
        </p>
        <button
          type="button"
          onClick={() => refetchRequests()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#090a0f] select-none overflow-hidden">
      {/* Canvas Toolbar */}
      <CanvasToolbar
        workspaceId={workspaceId}
        collections={collections}
        onOpenPicker={openRequestPicker}
        onFitView={handleFitView}
        onResetLayout={resetToDefaultLayout}
        onAddCollection={addCollection}
      />

      {/* React Flow Viewport */}
      <ReactFlow
        nodes={nodes}
        edges={combinedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnectWithSave}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView={nodes.length > 0}
        minZoom={0.2}
        maxZoom={2}
        selectionMode="partial"
        selectNodesOnDrag={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        className="bg-[#090a0f]"
      >
        <Background
          variant="dots"
          gap={20}
          size={1}
          color="#1e2330"
          className="bg-[#090a0f]"
        />
        <CanvasControls />
        {nodes.length > 0 && <CanvasMiniMap />}
      </ReactFlow>

      {/* Empty Canvas Overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
          <div className="pointer-events-auto max-w-md w-full p-6 rounded-2xl bg-[#111318]/95 border border-[#232732] shadow-2xl text-center backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-[#181b22] border border-[#2b313e] flex items-center justify-center text-sky-400 mx-auto mb-3 shadow-md">
              <Network size={22} />
            </div>

            {collections.length === 0 ? (
              <>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">
                  Create a Collection First
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  The API canvas organizes requests visually. Create a collection in the sidebar
                  to begin adding requests.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">
                  Your API Canvas is Empty
                </h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Add existing requests from your workspace to start mapping relationships and
                  visualizing your API flow.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={openRequestPicker}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Request</span>
                  </button>

                  {allRequests.length > 0 && (
                    <button
                      type="button"
                      onClick={resetToDefaultLayout}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-200 font-medium text-xs transition-colors cursor-pointer"
                    >
                      <Layers size={13} className="text-sky-400" />
                      <span>Auto-Place All ({allRequests.length})</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Multi-Selection Action Toolbar */}
      <CanvasSelectionToolbar
        workspaceId={workspaceId}
        collections={collections}
        onSaveLayout={saveLayout}
      />

      {/* Right-Click Node Context Menu */}
      <NodeContextMenu onSaveLayout={saveLayout} />

      {/* Right-Click Empty Pane Context Menu */}
      <CanvasPaneContextMenu
        onFitView={handleFitView}
        onSaveLayout={saveLayout}
        collections={collections}
      />

      {/* Request Picker Modal */}
      <RequestPickerModal
        isOpen={isRequestPickerOpen}
        onClose={closeRequestPicker}
        allRequests={allRequests}
        collections={collections}
        onSelectRequest={addRequest}
        onAddCollection={addCollection}
      />

      {/* Visual Relationship Legend */}
      <CanvasLegend isOpen={isLegendOpen} onClose={toggleLegend} />

      {/* Relationship Details Inspector Modal */}
      <RelationshipDetailsModal onSaveLayout={saveLayout} />
    </div>
  );
}

export default function ApiCanvas({ workspaceId }) {
  return (
    <ReactFlowProvider>
      <ApiCanvasInternal workspaceId={workspaceId} />
    </ReactFlowProvider>
  );
}
