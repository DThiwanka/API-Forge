import { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Code2,
  Minimize2,
  Maximize2,
  MoreHorizontal,
} from 'lucide-react';
import { buildJsonPath } from '../utils/jsonPath';
import { formatPrimitiveValue } from '../utils/responseActionHelpers';
import JsonNodeContextMenu from './JsonNodeContextMenu';
import { useToastStore } from '../../../stores/toastStore';
import { cn } from '../../../utils/cn';

// Highlight matching search tokens
function highlightText(text, query) {
  if (!query || !query.trim() || typeof text !== 'string') return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-500/30 text-amber-200 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function JsonTreeNode({
  nodeKey,
  value,
  parentPath = '$',
  isParentArray = false,
  depth = 0,
  expandedPaths,
  toggleExpand,
  searchQuery = '',
  onCopyPath,
  copiedPath,
  onCreateTest,
  onCreateExtraction,
}) {
  const [contextMenu, setContextMenu] = useState(null);

  const currentPath = useMemo(() => {
    if (depth === 0) return '$';
    return buildJsonPath(parentPath, nodeKey, isParentArray);
  }, [parentPath, nodeKey, isParentArray, depth]);

  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isExpanded = expandedPaths.has(currentPath);

  const entries = useMemo(() => {
    if (!isObject) return [];
    if (isArray) return value.map((v, i) => [i, v]);
    return Object.entries(value);
  }, [isObject, isArray, value]);

  const count = entries.length;

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleExpand(currentPath);
  };

  const handleCopyPath = (e) => {
    if (e) e.stopPropagation();
    onCopyPath(currentPath);
  };

  const handleCopyValue = (e) => {
    if (e) e.stopPropagation();
    const formatted = formatPrimitiveValue(value);
    navigator.clipboard.writeText(formatted);
    useToastStore.getState().toast.success('Value copied to clipboard');
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleOpenMenuBtn = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: rect.left, y: rect.bottom + 4 });
  };

  const isCopied = copiedPath === currentPath;

  // Render primitive value with type styling, carefully preserving falsy values (0, false, "", null)
  const renderPrimitiveValue = () => {
    if (value === null) {
      return <span className="text-slate-500 italic">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className="text-amber-400 font-semibold">{String(value)}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-purple-300 font-semibold">{String(value)}</span>;
    }
    if (typeof value === 'string') {
      return (
        <span className="text-emerald-300 break-all">
          &quot;{highlightText(value, searchQuery)}&quot;
        </span>
      );
    }
    return <span className="text-slate-300">{highlightText(String(value), searchQuery)}</span>;
  };

  return (
    <div className="font-mono text-xs select-text">
      <div
        onContextMenu={handleContextMenu}
        className={cn(
          'group flex items-center gap-1.5 py-0.5 px-2 -mx-2 rounded hover:bg-[#181b22] transition-colors relative min-h-[22px]',
          isCopied && 'bg-emerald-950/20'
        )}
        style={{ paddingLeft: `${Math.max(depth * 16 + 8, 8)}px` }}
      >
        {/* Expand / Collapse toggle or indent placeholder */}
        {isObject ? (
          <button
            type="button"
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 focus:outline-none shrink-0 cursor-pointer"
            title={isExpanded ? 'Collapse node' : 'Expand node'}
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Property Key or Array Index */}
        {nodeKey !== null && nodeKey !== undefined && (
          <span className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                'font-medium',
                isParentArray ? 'text-slate-400' : 'text-sky-300'
              )}
            >
              {highlightText(String(nodeKey), searchQuery)}
            </span>
            <span className="text-slate-500">:</span>
          </span>
        )}

        {/* Node value or object preview */}
        {isObject ? (
          <span
            onClick={handleToggle}
            className="cursor-pointer text-slate-400 hover:text-slate-200 flex items-center gap-1.5 select-none"
          >
            <span className="text-slate-500">
              {isArray ? '[' : '{'}
            </span>
            {!isExpanded && (
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#232732] text-slate-400 font-sans">
                {count} {count === 1 ? (isArray ? 'item' : 'key') : (isArray ? 'items' : 'keys')}
              </span>
            )}
            {!isExpanded && (
              <span className="text-slate-500">
                {isArray ? ']' : '}'}
              </span>
            )}
          </span>
        ) : (
          <div className="flex-1 min-w-0 truncate">{renderPrimitiveValue()}</div>
        )}

        {/* Hover Actions: Copy JSON Path & Context Menu */}
        <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 pl-2 transition-opacity shrink-0">
          <button
            type="button"
            onClick={handleCopyPath}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer',
              isCopied
                ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                : 'bg-[#1e2330] border-[#2b313e] text-slate-400 hover:text-slate-200 hover:bg-[#282f40]'
            )}
            title={`Copy JSONPath: ${currentPath}`}
          >
            {isCopied ? (
              <>
                <Check size={10} className="text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={10} />
                <span className="font-mono text-[10px]">{currentPath}</span>
              </>
            )}
          </button>

          {/* More Actions Dropdown (•••) */}
          <button
            type="button"
            onClick={handleOpenMenuBtn}
            className="p-1 rounded bg-[#1e2330] hover:bg-[#282f40] border border-[#2b313e] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Node actions: Copy value, Create test, Create extraction"
          >
            <MoreHorizontal size={11} />
          </button>
        </div>
      </div>

      {/* Child nodes when expanded */}
      {isObject && isExpanded && (
        <div>
          {entries.map(([childKey, childVal]) => (
            <JsonTreeNode
              key={childKey}
              nodeKey={childKey}
              value={childVal}
              parentPath={currentPath}
              isParentArray={isArray}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              searchQuery={searchQuery}
              onCopyPath={onCopyPath}
              copiedPath={copiedPath}
              onCreateTest={onCreateTest}
              onCreateExtraction={onCreateExtraction}
            />
          ))}
          <div
            className="text-slate-500 py-0.5"
            style={{ paddingLeft: `${Math.max(depth * 16 + 24, 24)}px` }}
          >
            {isArray ? ']' : '}'}
          </div>
        </div>
      )}

      {/* Node Context Menu */}
      {contextMenu && (
        <JsonNodeContextMenu
          isOpen={Boolean(contextMenu)}
          onClose={() => setContextMenu(null)}
          anchorCoords={contextMenu}
          jsonPath={currentPath}
          value={value}
          onCopyValue={handleCopyValue}
          onCopyPath={handleCopyPath}
          onCreateTest={onCreateTest}
          onCreateExtraction={onCreateExtraction}
        />
      )}
    </div>
  );
}

export default function JsonTree({
  data,
  searchQuery = '',
  onCreateTest,
  onCreateExtraction,
  className,
}) {
  const [copiedPath, setCopiedPath] = useState(null);

  // Compute all paths for expand-all
  const allExpandablePaths = useMemo(() => {
    const paths = new Set();
    function collect(val, path = '$') {
      if (val && typeof val === 'object') {
        paths.add(path);
        const isArr = Array.isArray(val);
        const entries = isArr ? val.map((v, i) => [i, v]) : Object.entries(val);
        for (const [k, v] of entries) {
          const childPath = buildJsonPath(path, k, isArr);
          collect(v, childPath);
        }
      }
    }
    collect(data, '$');
    return paths;
  }, [data]);

  // Initial expanded state: depth 0 and 1
  const initialExpandedPaths = useMemo(() => {
    const initial = new Set();
    function collectShallow(val, path = '$', depth = 0) {
      if (val && typeof val === 'object' && depth <= 1) {
        initial.add(path);
        const isArr = Array.isArray(val);
        const entries = isArr ? val.map((v, i) => [i, v]) : Object.entries(val);
        for (const [k, v] of entries) {
          const childPath = buildJsonPath(path, k, isArr);
          collectShallow(v, childPath, depth + 1);
        }
      }
    }
    collectShallow(data, '$', 0);
    return initial;
  }, [data]);

  const [expandedPaths, setExpandedPaths] = useState(initialExpandedPaths);

  const toggleExpand = useCallback((path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const expandAll = () => setExpandedPaths(new Set(allExpandablePaths));
  const collapseAll = () => setExpandedPaths(new Set());

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    useToastStore.getState().toast.success('JSON path copied');
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full bg-[#090a0f] text-slate-200', className)}>
      {/* Tree controls bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111318] border-b border-[#232732] text-xs select-none">
        <div className="flex items-center gap-2 text-slate-400">
          <Code2 size={13} className="text-sky-400" />
          <span className="font-semibold text-[11px] uppercase tracking-wider">JSON Tree</span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] font-mono text-slate-400">
            {allExpandablePaths.size} {allExpandablePaths.size === 1 ? 'node' : 'nodes'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 transition-colors cursor-pointer"
            title="Expand all nodes"
          >
            <Maximize2 size={11} />
            <span>Expand All</span>
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 transition-colors cursor-pointer"
            title="Collapse all nodes"
          >
            <Minimize2 size={11} />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-4 space-y-0.5">
        <JsonTreeNode
          nodeKey={null}
          value={data}
          parentPath="$"
          isParentArray={false}
          depth={0}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
          searchQuery={searchQuery}
          onCopyPath={handleCopyPath}
          copiedPath={copiedPath}
          onCreateTest={onCreateTest}
          onCreateExtraction={onCreateExtraction}
        />
      </div>
    </div>
  );
}
