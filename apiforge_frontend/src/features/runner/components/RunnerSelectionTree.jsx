import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileCode, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../../utils/cn';

const METHOD_COLORS = {
  GET: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  POST: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  PUT: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
  PATCH: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
  DELETE: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
  HEAD: 'text-teal-400 bg-teal-950/40 border-teal-800/40',
  OPTIONS: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
};

function IndeterminateCheckbox({ checked, indeterminate, onChange, disabled, id }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      id={id}
      ref={ref}
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={onChange}
      className="w-3.5 h-3.5 rounded bg-[#161922] border-[#2e3444] text-sky-500 focus:ring-sky-500/30 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed accent-sky-500 shrink-0"
    />
  );
}

export default function RunnerSelectionTree({
  folders = [],
  requests = [],
  selectedRequestIds = [],
  onToggleRequest,
  onToggleFolder,
  onSelectAll,
  onDeselectAll,
  disabled = false,
  className,
}) {
  // Set of expanded folder IDs (default all expanded)
  const [expandedFolderIds, setExpandedFolderIds] = useState(() => {
    const initial = new Set();
    folders.forEach((f) => initial.add(f.id));
    return initial;
  });

  const toggleFolderExpand = (folderId) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Group folders by parentId
  const foldersByParent = useMemo(() => {
    const map = new Map();
    for (const f of folders) {
      const pId = f.parentId || null;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId).push(f);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.position - b.position) || (new Date(a.createdAt) - new Date(b.createdAt)));
    }
    return map;
  }, [folders]);

  // Group requests by folderId
  const requestsByFolder = useMemo(() => {
    const map = new Map();
    for (const r of requests) {
      const fId = r.folderId || null;
      if (!map.has(fId)) map.set(fId, []);
      map.get(fId).push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.position - b.position) || (new Date(a.createdAt) - new Date(b.createdAt)));
    }
    return map;
  }, [requests]);

  // Precompute recursive descendant request IDs for each folder
  const folderDescendantRequests = useMemo(() => {
    const map = new Map();

    function compute(folderId) {
      const result = [];
      const directReqs = requestsByFolder.get(folderId) || [];
      for (const r of directReqs) {
        result.push(r.id);
      }

      const childFolders = foldersByParent.get(folderId) || [];
      for (const child of childFolders) {
        result.push(...compute(child.id));
      }

      map.set(folderId, result);
      return result;
    }

    for (const f of folders) {
      compute(f.id);
    }

    return map;
  }, [folders, foldersByParent, requestsByFolder]);

  const selectedSet = useMemo(() => new Set(selectedRequestIds), [selectedRequestIds]);

  const totalRequestsCount = requests.length;
  const selectedCount = selectedRequestIds.length;

  const renderFolder = (folder, depth = 0) => {
    const isExpanded = expandedFolderIds.has(folder.id);
    const descendantIds = folderDescendantRequests.get(folder.id) || [];
    const directReqs = requestsByFolder.get(folder.id) || [];
    const childFolders = foldersByParent.get(folder.id) || [];

    const selectedDescendantsCount = descendantIds.filter((id) => selectedSet.has(id)).length;
    const isChecked = descendantIds.length > 0 && selectedDescendantsCount === descendantIds.length;
    const isIndeterminate = selectedDescendantsCount > 0 && selectedDescendantsCount < descendantIds.length;

    const handleFolderCheckbox = (e) => {
      e.stopPropagation();
      onToggleFolder(folder.id, descendantIds, isChecked || isIndeterminate);
    };

    return (
      <div key={folder.id} className="select-none">
        <div
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={cn(
            'flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-[#161821] group transition-colors cursor-pointer text-xs',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
          onClick={() => toggleFolderExpand(folder.id)}
        >
          <button
            type="button"
            className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              toggleFolderExpand(folder.id);
            }}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            <IndeterminateCheckbox
              id={`folder-${folder.id}`}
              checked={isChecked}
              indeterminate={isIndeterminate}
              disabled={disabled || descendantIds.length === 0}
              onChange={handleFolderCheckbox}
            />
          </div>

          <span className="text-amber-400/90 shrink-0">
            {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>

          <span className="font-medium text-slate-200 truncate">{folder.name}</span>

          <span className="text-[10px] font-mono text-slate-500 ml-auto shrink-0">
            {selectedDescendantsCount}/{descendantIds.length}
          </span>
        </div>

        {isExpanded && (
          <div>
            {childFolders.map((child) => renderFolder(child, depth + 1))}
            {directReqs.map((req) => renderRequest(req, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderRequest = (request, depth = 0) => {
    const isChecked = selectedSet.has(request.id);
    const methodStyle = METHOD_COLORS[request.method] || 'text-slate-400 bg-slate-900/40 border-slate-800';

    return (
      <div
        key={request.id}
        style={{ paddingLeft: `${depth * 14 + 24}px` }}
        onClick={() => !disabled && onToggleRequest(request.id)}
        className={cn(
          'flex items-center gap-2 py-1 px-2 rounded-md hover:bg-[#161821] group transition-colors cursor-pointer text-xs',
          isChecked && 'bg-sky-950/10',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <input
            type="checkbox"
            id={`req-${request.id}`}
            checked={isChecked}
            disabled={disabled}
            onChange={() => onToggleRequest(request.id)}
            className="w-3.5 h-3.5 rounded bg-[#161922] border-[#2e3444] text-sky-500 focus:ring-sky-500/30 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed accent-sky-500 shrink-0"
          />
        </div>

        <span
          className={cn(
            'px-1.5 py-0.2 rounded font-mono text-[9px] font-bold border shrink-0',
            methodStyle
          )}
        >
          {request.method}
        </span>

        <span className="text-slate-200 truncate font-mono text-[11px]">{request.name}</span>
      </div>
    );
  };

  const rootFolders = foldersByParent.get(null) || [];
  const rootRequests = requestsByFolder.get(null) || [];

  return (
    <div className={cn('flex flex-col bg-[#0f1117] border border-[#232732] rounded-lg overflow-hidden', className)}>
      {/* Header / Selection Controls */}
      <div className="px-3 py-2 bg-[#141720] border-b border-[#232732] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">Requests to Execute</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#1c202b] text-slate-400 border border-[#2b3140]">
            {selectedCount} / {totalRequestsCount} selected
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || selectedCount === totalRequestsCount}
            className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#1e2330] transition-colors disabled:opacity-40 flex items-center gap-1"
            title="Select all requests"
          >
            <CheckSquare size={11} />
            <span>All</span>
          </button>

          <button
            type="button"
            onClick={onDeselectAll}
            disabled={disabled || selectedCount === 0}
            className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#1e2330] transition-colors disabled:opacity-40 flex items-center gap-1"
            title="Deselect all requests"
          >
            <Square size={11} />
            <span>None</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-2 overflow-y-auto max-h-[380px] space-y-0.5">
        {requests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            This collection has no saved requests.
          </div>
        ) : (
          <>
            {rootFolders.map((folder) => renderFolder(folder, 0))}
            {rootRequests.map((req) => renderRequest(req, 0))}
          </>
        )}
      </div>
    </div>
  );
}

