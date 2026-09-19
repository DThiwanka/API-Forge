import { useEffect } from 'react';
import useCanvasStore from '../store/canvasStore.js';
import { isEditableElement, isMac } from '../../shortcuts/utils/shortcutUtils.js';
import useShortcutStore from '../../shortcuts/store/shortcutStore.js';
import { SHORTCUT_SCOPES } from '../../shortcuts/constants/shortcutRegistry.js';

export default function useCanvasShortcuts({ fitView, setCenter }) {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const nodes = useCanvasStore((s) => s.nodes);
  const deleteSelectedNodes = useCanvasStore((s) => s.deleteSelectedNodes);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const selectAllNodes = useCanvasStore((s) => s.selectAllNodes);
  const closeRequestPicker = useCanvasStore((s) => s.closeRequestPicker);

  // Manage CANVAS scope lifecycle
  useEffect(() => {
    useShortcutStore.getState().pushScope(SHORTCUT_SCOPES.CANVAS);
    return () => {
      useShortcutStore.getState().popScope(SHORTCUT_SCOPES.CANVAS);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      // Do not intercept if active scope is higher priority (e.g., DIALOG)
      const currentScope = useShortcutStore.getState().getCurrentScope();
      if (currentScope === SHORTCUT_SCOPES.DIALOG) return;

      // Don't intercept if user is typing in an input, textarea, contenteditable, or code editor
      if (isEditableElement(e.target)) return;

      const isCmdOrCtrl = isMac() ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + A: Select all nodes
      if (isCmdOrCtrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllNodes();
        return;
      }

      // Delete / Backspace: Remove selected node(s) from canvas store ONLY (never deletes from backend)
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
