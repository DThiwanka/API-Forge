import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMethodStyle } from '../utils/nodeHelpers';
import useCanvasStore from '../store/canvasStore';
import useRequestTabStore from '../../requests/store/requestTabStore';
import { useResourceNavigation } from '../../../hooks/useResourceNavigation';
import { cn } from '../../../utils/cn';
import { redactUrl } from '../../../utils/redaction.js';

function RequestNodeComponent({ id, data, selected }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { openRequest } = useResourceNavigation(workspaceId);
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const openContextMenu = useCanvasStore((s) => s.openContextMenu);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const edges = useCanvasStore((s) => s.edges);
  const selectedRelationship = useCanvasStore((s) => s.selectedRelationship);

  const tabs = useRequestTabStore((s) => s.tabsByWorkspace[workspaceId] || []);
  const activeTabId = useRequestTabStore((s) => s.activeTabByWorkspace[workspaceId]);

  const {
    requestId,
    collectionId,
    collectionName = 'Collection',
    folderName,
    breadcrumb,
    name,
    method = 'GET',
    url,
    lastStatus,
    lastDurationMs,
  } = data || {};

  const matchingTab = tabs.find((t) => t.requestId === requestId);
  const isOpenInTab = Boolean(matchingTab);
  const isActiveTab = activeTabId === requestId;
  const isDirty = Boolean(matchingTab?.isDirty);

  const methodStyle = getMethodStyle(method);

  const effectiveBreadcrumb = breadcrumb || (folderName ? `${collectionName} / ${folderName}` : collectionName);

  const query = (searchQuery || '').trim().toLowerCase();
  const isMatchedBySearch =
    query.length > 0 &&
    ((name && name.toLowerCase().includes(query)) ||
      (url && url.toLowerCase().includes(query)) ||
      (method && method.toLowerCase().includes(query)) ||
      (effectiveBreadcrumb && effectiveBreadcrumb.toLowerCase().includes(query)));

  // Relationship Highlighting / Dimming
  const isAnotherNodeSelected = Boolean(selectedNodeId && selectedNodeId !== id);
  const isConnectedToSelected =
    isAnotherNodeSelected &&
    (edges.some(
      (e) =>
        (e.source === id && e.target === selectedNodeId) ||
        (e.source === selectedNodeId && e.target === id)
    ) ||
      (selectedRelationship &&
        (selectedRelationship.source === id || selectedRelationship.target === id)));

  const isDimmed = isAnotherNodeSelected && !isConnectedToSelected;

  const handleOpenRequest = (e) => {
    e.stopPropagation();
    if (workspaceId && collectionId && requestId) {
      navigate(
        `/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`
      );
      openRequest(requestId, {
        collectionId,
        title: name,
        method,
        url,
      });
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu({
      x: e.clientX,
      y: e.clientY,
      node: { id, data },
    });
  };

  const displayUrl = url ? redactUrl(url) : '';

  return (
    <div
      onDoubleClick={handleOpenRequest}
      onContextMenu={handleContextMenu}
      className={cn(
        'group relative w-64 rounded-xl bg-[#12141c] border transition-all duration-150 select-none shadow-lg',
        selected
          ? 'border-sky-500 shadow-sky-500/15 ring-2 ring-sky-500/60 z-10'
          : isConnectedToSelected
          ? 'border-sky-400/80 shadow-sky-400/10 ring-1 ring-sky-400/50 z-10'
          : isActiveTab
          ? 'border-sky-400/80 shadow-sky-400/20 ring-1 ring-sky-400/50'
          : 'border-[#262c3b] hover:border-slate-500 shadow-black/40',
        isMatchedBySearch && 'ring-2 ring-amber-400/90 border-amber-400',
        isDimmed && 'opacity-35 hover:opacity-100'
      )}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#1c212c] !border !border-slate-500 hover:!bg-sky-400 hover:!border-sky-300 transition-colors"
      />

      {/* Node Header: Method, Breadcrumbs, Open / Dirty Indicator */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between border-b border-[#212634] bg-[#151824] rounded-t-xl">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border shrink-0',
              methodStyle.badge
            )}
          >
            {method}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={effectiveBreadcrumb}>
            {effectiveBreadcrumb}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Dirty indicator */}
          {isDirty && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
              title="Unsaved changes in workspace"
            />
          )}

          {/* Open in tab badge */}
          {isOpenInTab && (
            <span
              className={cn(
                'text-[9px] font-mono font-semibold px-1 py-0.2 rounded border transition-colors',
                isActiveTab
                  ? 'bg-sky-500/25 text-sky-300 border-sky-400/60 shadow-[0_0_6px_rgba(56,189,248,0.4)]'
                  : 'bg-sky-950/60 text-sky-400 border-sky-800/40'
              )}
              title={isActiveTab ? 'Active Request in Workspace' : 'Currently open in request tab'}
            >
              {isActiveTab ? 'ACTIVE' : 'TAB'}
            </span>
          )}

          <button
            type="button"
            onClick={handleOpenRequest}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white hover:bg-[#232732] rounded transition-all"
            title="Open in Request Workspace"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Node Body: Name & URL */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs font-semibold text-slate-200 truncate" title={name}>
          {name || 'Untitled Request'}
        </div>
        <div
          className="text-[11px] font-mono text-slate-400 truncate bg-[#0d0f14] px-1.5 py-0.5 rounded border border-[#1d222d]"
          title={displayUrl || 'No URL specified'}
        >
          {displayUrl || <span className="italic text-slate-600">No URL configured</span>}
        </div>
      </div>

      {/* Node Footer: Status & Timing if present */}
      {(lastStatus || lastDurationMs) && (
        <div className="px-3 py-1 bg-[#0f1118] border-t border-[#202533] rounded-b-xl flex items-center justify-between text-[10px] font-mono">
          {lastStatus && (
            <div className="flex items-center gap-1">
              {lastStatus >= 200 && lastStatus < 300 ? (
                <CheckCircle2 size={11} className="text-emerald-400" />
              ) : (
                <AlertCircle size={11} className="text-rose-400" />
              )}
              <span
                className={
                  lastStatus >= 200 && lastStatus < 300
                    ? 'text-emerald-400 font-semibold'
                    : 'text-rose-400 font-semibold'
                }
              >
                {lastStatus}
              </span>
            </div>
          )}

          {lastDurationMs && (
            <div className="flex items-center gap-1 text-slate-400">
              <Clock size={10} />
              <span>{lastDurationMs}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Source Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#1c212c] !border !border-slate-500 hover:!bg-sky-400 hover:!border-sky-300 transition-colors"
      />
    </div>
  );
}

export const RequestNode = memo(RequestNodeComponent);
export default RequestNode;
