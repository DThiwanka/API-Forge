import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Trash2, Clock, HardDrive, Info } from 'lucide-react';
import {
  METHOD_STYLES,
  getStatusBadge,
  formatDuration,
  formatBytes,
  formatRelativeTime,
} from '../utils/historyHelpers';
import { cn } from '../../../utils/cn';

export default function HistoryItem({
  item,
  onInspect,
  onDelete,
  canDelete = false,
}) {
  const navigate = useNavigate();
  const statusInfo = getStatusBadge(item.status, item.errorType);
  const methodStyle = METHOD_STYLES[item.method] || 'text-slate-400 bg-slate-800/40 border-slate-700/40';

  const hasRequest = Boolean(item.requestId && item.request?.name);

  const handleOpenRequest = (e) => {
    e.stopPropagation();
    if (hasRequest && item.collectionId) {
      navigate(
        `/workspace/${item.workspaceId}/collections/${item.collectionId}/requests/${item.requestId}`
      );
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(item);
  };

  return (
    <div
      onClick={() => onInspect(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect(item);
        }
      }}
      className="group flex flex-col md:flex-row md:items-center justify-between gap-2.5 px-3.5 py-2.5 bg-[#101218] hover:bg-[#151821] border border-[#232732] hover:border-[#2f3545] rounded-lg transition-all cursor-pointer select-none text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/50"
    >
      {/* Left section: Method, Status, Name & URL */}
      <div className="flex items-start md:items-center gap-3 flex-1 min-w-0">
        {/* Method Badge */}
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider uppercase shrink-0',
            methodStyle
          )}
        >
          {item.method}
        </span>

        {/* Status Code / Error Badge */}
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0',
            statusInfo.color
          )}
        >
          {statusInfo.label}
        </span>

        {/* Request Name and Executed URL */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200 truncate">
              {item.request?.name || 'API Request'}
            </span>
            {item.environment?.name && (
              <span className="text-[10px] text-slate-500 font-mono px-1 rounded bg-[#181b22] border border-[#2b313e]">
                {item.environment.name}
              </span>
            )}
          </div>
          <span
            className="text-[11px] font-mono text-slate-400 truncate max-w-xl group-hover:text-slate-300 transition-colors"
            title={item.url}
          >
            {item.url}
          </span>
        </div>
      </div>

      {/* Right section: Duration, Size, Timestamp & Action buttons */}
      <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 text-slate-400 font-mono text-[11px] pt-1 md:pt-0 border-t border-[#1c202a] md:border-none">
        {/* Metrics */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-slate-400" title="Execution duration">
            <Clock size={11} className="text-slate-500" />
            <span>{formatDuration(item.duration)}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400" title="Response payload size">
            <HardDrive size={11} className="text-slate-500" />
            <span>{formatBytes(item.responseSize)}</span>
          </div>

          <div className="text-[10px] text-slate-500" title={new Date(item.createdAt).toLocaleString()}>
            {formatRelativeTime(item.createdAt)}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {hasRequest ? (
            <button
              type="button"
              onClick={handleOpenRequest}
              className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-[#1c212d] transition-colors"
              title="Open in Request Editor"
            >
              <ExternalLink size={13} />
            </button>
          ) : (
            <span
              className="p-1 text-slate-600 cursor-not-allowed"
              title="Original request definition is no longer available"
            >
              <Info size={13} />
            </span>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
              title="Delete execution record"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

