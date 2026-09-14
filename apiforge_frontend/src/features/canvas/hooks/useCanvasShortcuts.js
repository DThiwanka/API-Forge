import { useEffect } from 'react';
import useCanvasStore from '../store/canvasStore';

export default function useCanvasShortcuts({ fitView, setCenter }) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const deleteSelectedNodes = useCanvasStore((s) => s.deleteSelectedNodes);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const selectAllNodes = useCanvasStore((s) => s.selectAllNodes);
  const closeRequestPicker = useCanvasStore((s) => s.closeRequestPicker);

  useEffect(() => {
    function handleKeyDown(e) {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + A: Select all nodes
      if (isCmdOrCtrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllNodes();
        return;
      }

      // Delete / Backspace: Remove selected node(s) from canvas
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const hasSelection = Boolean(selectedNodeId) || nodes.some((n) => n.selected);
        if (hasSelection) {
          e.preventDefault();
          deleteSelectedNodes();
          return;
        }
      }

      // F: Focus selected node or Fit View
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const selectedNode = nodes.find((n) => n.id === selectedNodeId || n.selected);
        if (selectedNode && typeof setCenter === 'function') {
          setCenter(selectedNode.position.x + 120, selectedNode.position.y + 60, {
            zoom: 1.2,
            duration: 350,
          });
        } else if (typeof fitView === 'function') {
          fitView({ padding: 0.2, duration: 300 });
        }
        return;
      }

      // Escape: Clear selection and close menus
      if (e.key === 'Escape') {
        clearSelection();
        closeRequestPicker();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    nodes,
    deleteSelectedNodes,
    clearSelection,
    selectAllNodes,
    closeRequestPicker,
    fitView,
    setCenter,
  ]);
}
