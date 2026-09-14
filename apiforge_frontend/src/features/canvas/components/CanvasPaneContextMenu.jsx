import { useEffect, useRef } from 'react';
import { Plus, Maximize2, LayoutGrid, CheckSquare } from 'lucide-react';
import useCanvasStore from '../store/canvasStore';

export default function CanvasPaneContextMenu({ onFitView, onSaveLayout, collections = [] }) {
  const paneContextMenu = useCanvasStore((s) => s.paneContextMenu);
  const closePaneContextMenu = useCanvasStore((s) => s.closePaneContextMenu);
  const openRequestPicker = useCanvasStore((s) => s.openRequestPicker);
  const selectAllNodes = useCanvasStore((s) => s.selectAllNodes);
  const arrangeNodes = useCanvasStore((s) => s.arrangeNodes);
  const nodes = useCanvasStore((s) => s.nodes);

  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closePaneContextMenu();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closePaneContextMenu();
      }
    }

    if (paneContextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [paneContextMenu.isOpen, closePaneContextMenu]);

  if (!paneContextMenu.isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{ top: `${paneContextMenu.y}px`, left: `${paneContextMenu.x}px` }}
      className="fixed z-50 w-52 rounded-lg bg-[#14171f] border border-[#2b313e] shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-3 py-1.5 border-b border-[#232732] text-[10px] font-mono text-slate-400">
        CANVAS ACTIONS
      </div>

      <button
        type="button"
        onClick={() => {
          closePaneContextMenu();
          openRequestPicker();
        }}
        className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
      >
        <Plus size={13} className="text-sky-400" />
        <span>Add Request...</span>
      </button>

      {nodes.length > 0 && (
        <button
          type="button"
          onClick={() => {
            closePaneContextMenu();
            if (onFitView) onFitView();
          }}
          className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Maximize2 size={13} className="text-emerald-400" />
            <span>Fit View</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">F</span>
        </button>
      )}

      {nodes.length > 0 && (
        <button
          type="button"
          onClick={() => {
            closePaneContextMenu();
            arrangeNodes(collections);
            if (onSaveLayout) onSaveLayout();
          }}
          className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LayoutGrid size={13} className="text-purple-400" />
          <span>Arrange in Grid</span>
        </button>
      )}

      {nodes.length > 0 && (
        <div className="my-1 border-t border-[#232732]" />
      )}

      {nodes.length > 0 && (
        <button
          type="button"
          onClick={() => {
            closePaneContextMenu();
            selectAllNodes();
          }}
          className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center justify-between transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CheckSquare size={13} className="text-amber-400" />
            <span>Select All Nodes</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Ctrl+A</span>
        </button>
      )}
    </div>
  );
}

