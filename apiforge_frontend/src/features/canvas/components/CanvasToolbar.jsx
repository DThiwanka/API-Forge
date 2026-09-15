import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Network,
  Plus,
  Search,
  Maximize2,
  LayoutGrid,
  ChevronDown,
  Layers,
  X,
  ChevronUp,
  Sparkles,
  Check,
  Info,
} from 'lucide-react';
import useCanvasStore from '../store/canvasStore';
import { useEnvironmentsQuery } from '../../environments/hooks/useEnvironments';

export default function CanvasToolbar({
  workspaceId,
  collections = [],
  onOpenPicker,
  onFitView,
  onResetLayout,
  onAddCollection,
}) {
  const nodes = useCanvasStore((s) => s.nodes);
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const setSearchQuery = useCanvasStore((s) => s.setSearchQuery);
  const setFocusNodeId = useCanvasStore((s) => s.setFocusNodeId);

  // Step 48: Relationships Controls
  const relationshipFilter = useCanvasStore((s) => s.relationshipFilter);
  const setRelationshipFilter = useCanvasStore((s) => s.setRelationshipFilter);
  const inferredTypeFilters = useCanvasStore((s) => s.inferredTypeFilters);
  const toggleInferredTypeFilter = useCanvasStore((s) => s.toggleInferredTypeFilter);
  const isLegendOpen = useCanvasStore((s) => s.isLegendOpen);
  const toggleLegend = useCanvasStore((s) => s.toggleLegend);

  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [isRelMenuOpen, setIsRelMenuOpen] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const colMenuRef = useRef(null);
  const relMenuRef = useRef(null);

  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);
  const activeEnv = environments.find((e) => e.isActive);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
        setIsColMenuOpen(false);
      }
      if (relMenuRef.current && !relMenuRef.current.contains(e.target)) {
        setIsRelMenuOpen(false);
      }
    }
    if (isColMenuOpen || isRelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColMenuOpen, isRelMenuOpen]);

  // Compute matched nodes
  const matchedNodes = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return [];
    return nodes.filter((n) => {
      const d = n.data || {};
      return (
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.url && d.url.toLowerCase().includes(q)) ||
        (d.method && d.method.toLowerCase().includes(q)) ||
        (d.breadcrumb && d.breadcrumb.toLowerCase().includes(q))
      );
    });
  }, [nodes, searchQuery]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setMatchIndex(0);
    const q = val.trim().toLowerCase();
    if (q) {
      const first = nodes.find((n) => {
        const d = n.data || {};
        return (
          (d.name && d.name.toLowerCase().includes(q)) ||
          (d.url && d.url.toLowerCase().includes(q)) ||
          (d.method && d.method.toLowerCase().includes(q)) ||
          (d.breadcrumb && d.breadcrumb.toLowerCase().includes(q))
        );
      });
      if (first) {
        setFocusNodeId(first.id);
      }
    }
  };

  const handleNextMatch = () => {
    if (matchedNodes.length === 0) return;
    const next = (matchIndex + 1) % matchedNodes.length;
    setMatchIndex(next);
    setFocusNodeId(matchedNodes[next].id);
  };

  const handlePrevMatch = () => {
    if (matchedNodes.length === 0) return;
    const prev = (matchIndex - 1 + matchedNodes.length) % matchedNodes.length;
    setMatchIndex(prev);
    setFocusNodeId(matchedNodes[prev].id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    }
  };

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

      {/* Active Environment context badge */}
      {activeEnv && (
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111318]/90 border border-[#232732] backdrop-blur-xs text-[11px] font-mono text-slate-300 shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-slate-500">Env:</span>
          <span className="font-semibold text-slate-200 truncate max-w-[110px]" title={activeEnv.name}>
            {activeEnv.name}
          </span>
        </div>
      )}

      {/* Action Buttons Group */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#111318]/90 border border-[#232732] backdrop-blur-xs shadow-xl text-xs">
        {/* Add Request Button */}
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
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
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] text-slate-300 hover:text-white border border-[#2b313e] transition-colors cursor-pointer"
              title="Add all requests from a collection"
            >
              <Layers size={12} className="text-sky-400" />
              <span>Collection</span>
              <ChevronDown size={11} className="text-slate-500" />
            </button>

            {isColMenuOpen && (
              <div className="absolute left-0 mt-1 w-52 bg-[#181b22] border border-[#2b313e] rounded-lg shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 border-b border-[#232732] text-[10px] font-mono text-slate-400">
                  ADD COLLECTION REQUESTS
                </div>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setIsColMenuOpen(false);
                      if (onAddCollection) onAddCollection(c.id);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center justify-between transition-colors cursor-pointer"
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

        {/* Search & Focus Input */}
        <div className="relative flex items-center">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search Canvas..."
            className="w-32 focus:w-48 transition-all pl-7 pr-6 py-1 rounded bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-[11px] text-slate-100 placeholder:text-slate-500"
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

        {/* Search Match Controls */}
        {searchQuery && matchedNodes.length > 0 && (
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 pl-1 border-l border-[#232732]">
            <span>
              {matchIndex + 1}/{matchedNodes.length}
            </span>
            <button
              type="button"
              onClick={handlePrevMatch}
              className="p-0.5 hover:text-white rounded hover:bg-[#1f242e]"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp size={11} />
            </button>
            <button
              type="button"
              onClick={handleNextMatch}
              className="p-0.5 hover:text-white rounded hover:bg-[#1f242e]"
              title="Next match (Enter)"
            >
              <ChevronDown size={11} />
            </button>
          </div>
        )}

        <div className="h-4 w-px bg-[#232732] mx-0.5" />

        {/* Relationships Filter Dropdown */}
        <div className="relative" ref={relMenuRef}>
          <button
            type="button"
            onClick={() => setIsRelMenuOpen(!isRelMenuOpen)}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
              relationshipFilter !== 'none'
                ? 'bg-[#181b22] text-sky-300 border border-[#2b313e] hover:border-sky-500/50'
                : 'text-slate-400 hover:text-white hover:bg-[#181b22]'
            }`}
            title="Filter and configure API relationships"
          >
            <Sparkles size={12} className={relationshipFilter !== 'none' ? 'text-sky-400' : 'text-slate-400'} />
            <span className="font-medium text-[11px]">Relationships</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#0d0f14] border border-[#232732] text-slate-400">
              {relationshipFilter === 'all'
                ? 'All'
                : relationshipFilter === 'explicit'
                ? 'Explicit'
                : relationshipFilter === 'inferred'
                ? 'Inferred'
                : 'Off'}
            </span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>

          {isRelMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-[#111318] border border-[#232732] shadow-2xl p-2.5 z-50 text-xs space-y-2 select-none">
              <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                View Mode
              </div>

              <div className="space-y-0.5">
                {[
                  { id: 'all', label: 'All Relationships', desc: 'Show explicit & inferred links' },
                  { id: 'explicit', label: 'Explicit Connections', desc: 'Manually connected nodes only' },
                  { id: 'inferred', label: 'Inferred Dependencies', desc: 'Auto-discovered relationships only' },
                  { id: 'none', label: 'Hidden', desc: 'Hide all relationship lines' },
                ].map((mode) => {
                  const isSelected = relationshipFilter === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRelationshipFilter(mode.id)}
                      className={`w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-950/60 border border-sky-700/50 text-sky-200'
                          : 'text-slate-300 hover:bg-[#181b22] border border-transparent'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        {isSelected ? (
                          <Check size={12} className="text-sky-400" />
                        ) : (
                          <span className="w-3 h-3 block" />
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] font-medium leading-none mb-0.5">
                          {mode.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {mode.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Filters for Inferred Types */}
              {relationshipFilter !== 'explicit' && relationshipFilter !== 'none' && (
                <>
                  <div className="h-px bg-[#212634] my-1" />
                  <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Inferred Link Types
                  </div>

                  <div className="space-y-1 px-1">
                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={inferredTypeFilters.resource}
                        onChange={() => toggleInferredTypeFilter('resource')}
                        className="rounded border-[#2b313e] bg-[#181b22] text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Shared Resource Paths</span>
                    </label>

                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={inferredTypeFilters.variable}
                        onChange={() => toggleInferredTypeFilter('variable')}
                        className="rounded border-[#2b313e] bg-[#181b22] text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Variable Dependencies</span>
                    </label>

                    <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={inferredTypeFilters.auth}
                        onChange={() => toggleInferredTypeFilter('auth')}
                        className="rounded border-[#2b313e] bg-[#181b22] text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Auth Token Dependencies</span>
                    </label>
                  </div>
                </>
              )}

              <div className="h-px bg-[#212634] my-1" />

              {/* Legend Toggle */}
              <button
                type="button"
                onClick={() => toggleLegend()}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  isLegendOpen
                    ? 'bg-indigo-950/60 border border-indigo-700/50 text-indigo-200'
                    : 'text-slate-300 hover:bg-[#181b22] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Info size={12} className="text-slate-400" />
                  <span>Show Visual Legend</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {isLegendOpen ? 'Visible' : 'Hidden'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-[#232732] mx-0.5" />

        {/* Arrange Nodes Button */}
        <button
          type="button"
          onClick={onResetLayout}
          className="p-1 rounded text-slate-400 hover:text-purple-400 hover:bg-[#181b22] transition-colors cursor-pointer"
          title="Arrange nodes into clean grid"
        >
          <LayoutGrid size={13} />
        </button>

        {/* Fit View Button */}
        <button
          type="button"
          onClick={onFitView}
          className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-[#181b22] transition-colors cursor-pointer"
          title="Fit view to canvas (F)"
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
}
