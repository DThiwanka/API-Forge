import { memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMethodStyle } from '../utils/nodeHelpers';
import useCanvasStore from '../store/canvasStore';
import { cn } from '../../../utils/cn';

function RequestNodeComponent({ id, data, selected }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const searchQuery = useCanvasStore((s) => s.searchQuery);
  const openContextMenu = useCanvasStore((s) => s.openContextMenu);

  const {
    requestId,
    collectionId,
    collectionName,
    name,
    method = 'GET',
    url,
    lastStatus,
    lastDurationMs,
  } = data || {};

  const methodStyle = getMethodStyle(method);

  const isMatchedBySearch =
    searchQuery &&
    ((name && name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (url && url.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (method && method.toLowerCase().includes(searchQuery.toLowerCase())));

  const handleOpenRequest = (e) => {
    e.stopPropagation();
    if (workspaceId && collectionId && requestId) {
      navigate(
        `/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`
      );
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

  return (
    <div
      onDoubleClick={handleOpenRequest}
      onContextMenu={handleContextMenu}
      className={cn(
        'group relative w-64 rounded-lg bg-[#14171f] border transition-all duration-150 select-none shadow-lg',
        selected
          ? 'border-sky-500 shadow-sky-500/10 ring-1 ring-sky-500'
          : 'border-[#282e3b] hover:border-slate-500 shadow-black/40',
        isMatchedBySearch && 'ring-2 ring-amber-400/80 border-amber-400'
      )}
    >
      {/* Target Handle (Left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#1c212c] !border !border-slate-500 hover:!bg-sky-400 hover:!border-sky-300 transition-colors"
      />

      {/* Node Header: Method & Collection */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between border-b border-[#232732]/70 bg-[#111318]/60 rounded-t-lg">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border',
              methodStyle.badge
            )}
          >
            {method}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
            {collectionName}
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenRequest}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white hover:bg-[#232732] rounded transition-all"
          title="Open in Request Workspace"
        >
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Node Body: Name & URL */}
      <div className="px-3 py-2 space-y-1">
        <div className="text-xs font-semibold text-slate-200 truncate" title={name}>
          {name || 'Untitled Request'}
        </div>
        <div
          className="text-[11px] font-mono text-slate-400 truncate bg-[#0d0f14] px-1.5 py-0.5 rounded border border-[#1f242e]"
          title={url || 'No URL specified'}
        >
          {url || <span className="italic text-slate-600">No URL configured</span>}
        </div>
      </div>

      {/* Node Footer: Optional Status / Timing */}
      {(lastStatus || lastDurationMs) && (
        <div className="px-3 py-1 bg-[#0f1117] border-t border-[#232732]/60 rounded-b-lg flex items-center justify-between text-[10px] font-mono">
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

