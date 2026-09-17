import { memo } from 'react';
import {
  Radio,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  ArrowDownUp,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { useBrowserStore } from '../store/browserStore';
import { useNetworkActivity } from '../hooks/useNetworkActivity';
import NetworkInspector from './NetworkInspector';
import { cn } from '../../../utils/cn';

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMethodBadgeClass(method) {
  const m = (method || 'GET').toUpperCase();
  switch (m) {
    case 'GET':
      return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
    case 'POST':
      return 'text-sky-400 bg-sky-950/40 border-sky-800/50';
    case 'PUT':
      return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
    case 'PATCH':
      return 'text-purple-400 bg-purple-950/40 border-purple-800/50';
    case 'DELETE':
      return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
    default:
      return 'text-slate-300 bg-slate-900 border-slate-700';
  }
}

function getStatusBadgeClass(status, state) {
  if (state === 'failed') return 'text-rose-400';
  if (state === 'pending') return 'text-amber-400 animate-pulse';
  if (!status) return 'text-slate-400';
  if (status >= 200 && status < 300) return 'text-emerald-400';
  if (status >= 300 && status < 400) return 'text-cyan-400';
  if (status >= 400 && status < 500) return 'text-amber-400';
  return 'text-rose-400';
}

function NetworkActivityComponent({ workspaceId, sessionId, tabId }) {
  const isNetworkPanelOpen = useBrowserStore((s) => s.isNetworkPanelOpen);
  const toggleNetworkPanel = useBrowserStore((s) => s.toggleNetworkPanel);
  const isCapturing = useBrowserStore((s) => s.isCapturing);
  const toggleCapturing = useBrowserStore((s) => s.toggleCapturing);
  const networkFilter = useBrowserStore((s) => s.networkFilter);
  const setNetworkFilter = useBrowserStore((s) => s.setNetworkFilter);
  const networkSearch = useBrowserStore((s) => s.networkSearch);
  const setNetworkSearch = useBrowserStore((s) => s.setNetworkSearch);
  const selectedEventId = useBrowserStore((s) => s.selectedEventId);
  const setSelectedEventId = useBrowserStore((s) => s.setSelectedEventId);
  const clearSelectedEvent = useBrowserStore((s) => s.clearSelectedEvent);

  const {
    events,
    totalCount,
    filteredCount,
    selectedEvent,
    clearActivity,
    isClearing,
  } = useNetworkActivity(workspaceId, sessionId, tabId);

  if (!isNetworkPanelOpen) {
    return null;
  }

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'fetch', label: 'Fetch/XHR' },
    { id: 'doc', label: 'Doc' },
    { id: 'assets', label: 'JS/CSS' },
    { id: 'errors', label: 'Errors' },
  ];

  return (
    <div className="flex flex-col h-72 min-h-48 max-h-96 bg-[#0f1117] border-t border-[#232732] z-20 shrink-0 select-none">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#141720] border-b border-[#232732] text-xs">
        {/* Left: Title & Status Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleCapturing}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer',
              isCapturing
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-950/60'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
            )}
            title={isCapturing ? 'Pause network capture' : 'Resume network capture'}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isCapturing ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'
              )}
            />
            <span>{isCapturing ? 'Capturing' : 'Paused'}</span>
          </button>

          <button
            type="button"
            onClick={clearActivity}
            disabled={isClearing || totalCount === 0}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors',
              totalCount > 0 && !isClearing
                ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1e222d] cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            )}
            title="Clear network activity"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>

          <div className="h-3.5 w-px bg-[#262b38] mx-1" />

          {/* Filter Chips */}
          <div className="flex items-center gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setNetworkFilter(f.id)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer',
                  networkFilter === f.id
                    ? 'bg-[#232836] text-sky-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#181c25]'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search & Request Count & Minimize */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          {/* Search box */}
          <div className="relative flex items-center">
            <Search
              size={12}
              className="absolute left-2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              value={networkSearch}
              onChange={(e) => setNetworkSearch(e.target.value)}
              placeholder="Filter by path, host..."
              className="w-40 sm:w-52 h-6 pl-6 pr-6 bg-[#0c0e14] border border-[#232732] rounded text-[11px] text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-sky-500/70"
            />
            {networkSearch && (
              <button
                type="button"
                onClick={() => setNetworkSearch('')}
                className="absolute right-1.5 text-slate-500 hover:text-slate-300 p-0.5"
              >
                <X size={11} />
              </button>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {filteredCount === totalCount ? (
              <span>{totalCount} req</span>
            ) : (
              <span>{filteredCount}/{totalCount} req</span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleNetworkPanel}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
            title="Hide network panel"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area: Table + Optional Inspector Drawer */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Table View */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[80px_1fr_90px_70px_70px_70px] items-center px-3 py-1.5 bg-[#10131b] border-b border-[#232732] text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <div>Method</div>
            <div>Name</div>
            <div>Status</div>
            <div>Type</div>
            <div>Size</div>
            <div>Time</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#181c25]">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
                {totalCount === 0 ? (
                  <>
                    <Globe size={24} className="text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-400">No network activity recorded</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Navigate to a website or trigger requests to capture traffic live.
                    </p>
                  </>
                ) : (
                  <>
                    <Filter size={20} className="text-slate-600 mb-2" />
                    <p className="text-xs font-medium text-slate-400">No requests match criteria</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Try clearing the filter or adjusting your search term.
                    </p>
                  </>
                )}
              </div>
            ) : (
              events.map((event) => {
                const isSelected = selectedEventId === event.id;
                return (
                  <div
                    key={event.id}
                    onClick={() =>
                      setSelectedEventId(isSelected ? null : event.id)
                    }
                    className={cn(
                      'grid grid-cols-[80px_1fr_90px_70px_70px_70px] items-center px-3 py-1 text-xs cursor-pointer font-mono transition-colors',
                      isSelected
                        ? 'bg-sky-950/40 border-l-2 border-sky-400 text-slate-200'
                        : 'hover:bg-[#151922] text-slate-300'
                    )}
                  >
                    {/* Method */}
                    <div>
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase border',
                          getMethodBadgeClass(event.method)
                        )}
                      >
                        {event.method}
                      </span>
                    </div>

                    {/* Name / Path */}
                    <div className="min-w-0 pr-2 truncate">
                      <span className="text-slate-200 font-sans text-[11px]">
                        {event.pathname || '/'}
                      </span>
                      {event.hostname && (
                        <span className="text-slate-500 font-sans text-[10px] ml-1.5">
                          ({event.hostname})
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-[11px]">
                      <span className={cn('font-semibold', getStatusBadgeClass(event.status, event.state))}>
                        {event.state === 'failed'
                          ? 'Failed'
                          : event.state === 'pending'
                          ? 'Pending'
                          : event.status}
                      </span>
                    </div>

                    {/* Type */}
                    <div className="text-[10px] text-slate-400 capitalize">
                      {event.resourceType || 'other'}
                    </div>

                    {/* Size */}
                    <div className="text-[10px] text-slate-400">
                      {formatBytes(event.sizeBytes)}
                    </div>

                    {/* Time */}
                    <div className="text-[10px] text-slate-400">
                      {event.durationMs !== null ? `${event.durationMs}ms` : '—'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Event Detail Inspector Drawer */}
        {selectedEvent && (
          <NetworkInspector
            event={selectedEvent}
            onClose={clearSelectedEvent}
          />
        )}
      </div>
    </div>
  );
}

export const NetworkActivity = memo(NetworkActivityComponent);
export default NetworkActivity;

