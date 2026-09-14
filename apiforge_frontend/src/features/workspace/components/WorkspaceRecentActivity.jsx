import { useNavigate } from 'react-router-dom';
import { Activity, Clock, ChevronRight, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useHistoryQuery } from '../../history/hooks/useHistory';
import { METHOD_STYLES, formatDuration, formatRelativeTime } from '../../history/utils/historyHelpers';
import { formatExecutionStatus, sanitizeActivityItem } from '../utils/workspaceDashboardUtils';
import { cn } from '../../../utils/cn';

export default function WorkspaceRecentActivity({ workspaceId }) {
  const navigate = useNavigate();

  const {
    data: historyData,
    isLoading,
    isError,
  } = useHistoryQuery(workspaceId, { limit: 5 });

  const rawHistoryList = historyData?.history || [];
  const historyList = rawHistoryList.map(sanitizeActivityItem).filter(Boolean);

  const handleOpenItem = (item) => {
    if (item.requestId && item.collectionId) {
      navigate(
        `/workspace/${workspaceId}/collections/${item.collectionId}/requests/${item.requestId}`
      );
    } else {
      navigate(`/workspace/${workspaceId}/history`);
    }
  };

  return (
    <div className="flex flex-col bg-[#11131a] border border-[#232732] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f232e] bg-[#141721]">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-amber-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Recent Activity
          </h2>
          {historyList.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c202d] text-slate-400 border border-[#2a3040]">
              {historyList.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/workspace/${workspaceId}/history`)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <ArrowUpRight size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="divide-y divide-[#1b1f29] min-h-[140px] flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-xs text-slate-500 font-mono">
            Loading recent activity...
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 p-6 text-xs text-rose-400">
            <AlertCircle size={14} />
            <span>Failed to load activity</span>
          </div>
        ) : historyList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Clock size={22} className="text-slate-600 mb-2" />
            <span className="text-xs font-medium text-slate-300">No executions yet</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Send a request to see execution activity, latency, and status here.
            </p>
          </div>
        ) : (
          historyList.map((item) => {
            const method = (item.method || 'GET').toUpperCase();
            const methodStyle =
              METHOD_STYLES[method] || 'text-slate-400 bg-slate-800/40 border-slate-700/40';
            const statusInfo = formatExecutionStatus(item.status, item.errorType);

            return (
              <div
                key={item.id}
                onClick={() => handleOpenItem(item)}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#151924] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Method */}
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider shrink-0',
                      methodStyle
                    )}
                  >
                    {method}
                  </span>

                  {/* Status / Error badge */}
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border shrink-0',
                      statusInfo.colorClass
                    )}
                    title={statusInfo.isExecutionFailure ? 'Execution Error' : `HTTP Status ${statusInfo.label}`}
                  >
                    {statusInfo.label}
                  </span>

                  {/* Name and URL */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-200 truncate group-hover:text-sky-300 transition-colors">
                      {item.requestName}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-sm">
                      {item.url}
                    </span>
                  </div>
                </div>

                {/* Duration & Timestamp */}
                <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono text-slate-400">
                  <span>{formatDuration(item.duration)}</span>
                  <span className="text-[10px] text-slate-500">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-slate-300" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

