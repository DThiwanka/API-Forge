import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, Copy, Trash2 } from 'lucide-react';
import useCanvasStore from '../store/canvasStore';

export default function NodeContextMenu({ onSaveLayout }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const contextMenu = useCanvasStore((s) => s.contextMenu);
  const closeContextMenu = useCanvasStore((s) => s.closeContextMenu);
  const removeNodeFromCanvas = useCanvasStore((s) => s.removeNodeFromCanvas);
  const nodes = useCanvasStore((s) => s.nodes);
  const setNodes = useCanvasStore((s) => s.setNodes);

  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen || !contextMenu.node) {
    return null;
  }

  const { id, data } = contextMenu.node;
  const { requestId, collectionId } = data || {};

  const handleOpen = () => {
    closeContextMenu();
    if (workspaceId && collectionId && requestId) {
      navigate(
        `/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`
      );
    }
  };

  const handleDuplicateOnCanvas = () => {
    closeContextMenu();
    const sourceNode = nodes.find((n) => n.id === id);
    if (!sourceNode) return;

    // Create a visual duplicate on canvas
    const duplicateId = `${id}-dup-${Date.now()}`;
    const duplicateNode = {
      ...sourceNode,
      id: duplicateId,
      position: {
        x: sourceNode.position.x + 40,
        y: sourceNode.position.y + 40,
      },
      selected: true,
    };

    setNodes([...nodes.map((n) => ({ ...n, selected: false })), duplicateNode]);
    if (onSaveLayout) onSaveLayout();
  };

  const handleRemove = () => {
    closeContextMenu();
    removeNodeFromCanvas(id);
    if (onSaveLayout) onSaveLayout();
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
      className="fixed z-50 w-56 rounded-lg bg-[#14171f] border border-[#2b313e] shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 border-b border-[#232732] text-[10px] font-mono text-slate-400">
        CANVAS NODE ACTIONS
      </div>

      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors"
      >
        <ExternalLink size={13} className="text-sky-400" />
        <span>Open in Request Workspace</span>
      </button>

      <button
        type="button"
        onClick={handleDuplicateOnCanvas}
        className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors"
      >
        <Copy size={13} className="text-slate-400" />
        <span>Duplicate on Canvas</span>
      </button>

      <div className="h-px bg-[#232732] my-1" />

      <button
        type="button"
        onClick={handleRemove}
        className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-start gap-2 transition-colors"
      >
        <Trash2 size={13} className="mt-0.5" />
        <div>
          <div>Remove from Canvas</div>
          <div className="text-[10px] text-slate-500">Leaves request in collection</div>
        </div>
      </button>
    </div>
  );
}

