import { useState, useRef, useEffect } from 'react';
import {
  Network,
  Plus,
  Search,
  Maximize2,
  LayoutGrid,
  ChevronDown,
  Layers,
  X,
} from 'lucide-react';
import useCanvasStore from '../store/canvasStore';

export default function CanvasToolbar({
  collections = [],
  onOpenPicker,
  onFitView,
  onResetLayout,
  onAddCollection,
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const setSearchQuery = useCanvasStore((s) => s.setSearchQuery);

  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
        setIsColMenuOpen(false);
      }
    }
    if (isColMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColMenuOpen]);

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 select-none flex-wrap">
      {/* Title & Node Counter Card */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111318]/90 border border-[#232732] backdrop-blur-xs shadow-xl text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200">
          <Network size={14} className="text-sky-400" />
          <span>API Canvas</span>
        </div>
        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181b22] text-slate-400 border border-[#232732]">
          {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
        </span>
      </div>

      {/* Action Buttons Group */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#111318]/90 border border-[#232732] backdrop-blur-xs shadow-xl text-xs">
        {/* Add Request Button */}
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm"
          title="Add existing request to canvas"
        >
          <Plus size={13} />
          <span>Request</span>
        </button>

        {/* Add Collection Dropdown */}
        {collections.length > 0 && (
          <div className="relative" ref={colMenuRef}>
            <button
              type="button"
              onClick={() => setIsColMenuOpen(!isColMenuOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] text-slate-300 hover:text-white border border-[#2b313e] transition-colors"
              title="Add all requests from a collection"
            >
              <Layers size={12} className="text-sky-400" />
              <span>Add Collection</span>
              <ChevronDown size={11} className="text-slate-500" />
            </button>

            {isColMenuOpen && (
              <div className="absolute left-0 mt-1 w-52 bg-[#181b22] border border-[#2b313e] rounded-lg shadow-2xl py-1 z-50 text-xs">
                <div className="px-3 py-1 border-b border-[#232732] text-[10px] font-mono text-slate-400">
                  SELECT COLLECTION
                </div>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setIsColMenuOpen(false);
                      if (onAddCollection) onAddCollection(c.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">Add All</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-[#232732] mx-0.5" />

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter nodes..."
            className="w-32 focus:w-44 transition-all pl-7 pr-6 py-1 rounded bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-[11px] text-slate-100 placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-[#232732] mx-0.5" />

        {/* Fit View Button */}
        <button
          type="button"
          onClick={onFitView}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#181b22] transition-colors"
          title="Fit view (F)"
        >
          <Maximize2 size={13} />
        </button>

        {/* Reset / Auto Layout Button */}
        <button
          type="button"
          onClick={onResetLayout}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#181b22] transition-colors"
          title="Auto-arrange nodes in grid"
        >
          <LayoutGrid size={13} />
        </button>
      </div>
    </div>
  );
}

