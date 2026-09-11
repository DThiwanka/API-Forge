import { useEffect } from 'react';
import useCanvasStore from '../store/canvasStore';

export function useCanvasShortcuts({ fitView }) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const removeNodeFromCanvas = useCanvasStore((s) => s.removeNodeFromCanvas);
  const setSelectedNodeId = useCanvasStore((s) => s.setSelectedNodeId);
  const closeContextMenu = useCanvasStore((s) => s.closeContextMenu);
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

      // Delete / Backspace: Remove selected node from canvas
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        removeNodeFromCanvas(selectedNodeId);
        return;
      }

      // F: Fit View
      if ((e.key === 'f' || e.key === 'F') && typeof fitView === 'function') {
        e.preventDefault();
        fitView({ padding: 0.2, duration: 300 });
        return;
      }

      // Escape: Clear selection and close menus
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        closeContextMenu();
        closeRequestPicker();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    removeNodeFromCanvas,
    setSelectedNodeId,
    closeContextMenu,
    closeRequestPicker,
    fitView,
  ]);
}

export default useCanvasShortcuts;

