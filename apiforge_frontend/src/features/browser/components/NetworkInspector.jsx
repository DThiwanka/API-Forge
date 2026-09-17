import { useState, memo } from 'react';
import {
  X,
  Copy,
  Check,
  Globe,
  Clock,
  HardDrive,
  Shield,
  Layers,
  AlertCircle,
  FileCode,
} from 'lucide-react';
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
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
    case 'POST':
      return 'bg-sky-950/60 text-sky-400 border-sky-800/60';
    case 'PUT':
      return 'bg-amber-950/60 text-amber-400 border-amber-800/60';
    case 'PATCH':
      return 'bg-purple-950/60 text-purple-400 border-purple-800/60';
    case 'DELETE':
      return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
    default:
      return 'bg-slate-900 text-slate-300 border-slate-700';
  }
}

function getStatusBadgeClass(status, state) {
  if (state === 'failed') return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
  if (state === 'pending') return 'bg-amber-950/60 text-amber-400 border-amber-800/60 animate-pulse';
  if (!status) return 'bg-slate-800 text-slate-400 border-slate-700';
  if (status >= 200 && status < 300) return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
  if (status >= 300 && status < 400) return 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60';
  if (status >= 400 && status < 500) return 'bg-amber-950/60 text-amber-400 border-amber-800/60';
  return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
}

function NetworkInspectorComponent({ event, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'headers' | 'params'
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  if (!event) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(event.url);
      setHasCopiedUrl(true);
      setTimeout(() => setHasCopiedUrl(false), 2000);
    } catch {
      // Ignore
    }
  };

  const reqHeaders = Object.entries(event.requestHeaders || {});
  const resHeaders = Object.entries(event.responseHeaders || {});
  const queryParams = event.queryParams || [];

  return (
    <div className="flex flex-col h-full bg-[#111318] border-l border-[#232732] text-xs text-slate-300 w-full max-w-md shrink-0 select-text overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#232732] bg-[#14171f]">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border shrink-0',
              getMethodBadgeClass(event.method)
            )}
          >
            {event.method}
          </span>
          <span
            className="truncate font-mono text-[11px] text-slate-200"
            title={event.url}
          >
            {event.pathname || event.url}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
            title="Copy full URL"
          >
            {hasCopiedUrl ? (
              <Check size={13} className="text-emerald-400" />
            ) : (
              <Copy size={13} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors cursor-pointer"
            title="Close inspector"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 px-3 border-b border-[#232732] bg-[#0d0f14]">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'overview'
              ? 'text-sky-400 border-sky-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'headers'
              ? 'text-sky-400 border-sky-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          )}
        >
          <span>Headers</span>
          {(reqHeaders.length > 0 || resHeaders.length > 0) && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#1c202b] text-[10px] text-slate-400">
              {reqHeaders.length + resHeaders.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('params')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium border-b-2 transition-colors cursor-pointer',
            activeTab === 'params'
              ? 'text-sky-400 border-sky-500 font-semibold'
              : 'text-slate-400 border-transparent hover:text-slate-200'
          )}
        >
          <span>Params</span>
          {queryParams.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#1c202b] text-[10px] text-slate-400">
              {queryParams.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* General info block */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                General
              </h4>
              <div className="bg-[#151821] border border-[#232732] rounded-md divide-y divide-[#232732] font-mono text-[11px]">
                <div className="p-2 flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[10px]">Request URL</span>
                  <span className="text-slate-200 break-all select-all font-mono">{event.url}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Status Code</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] border',
                      getStatusBadgeClass(event.status, event.state)
                    )}
                  >
                    {event.state === 'failed'
                      ? 'Failed'
                      : event.state === 'pending'
                      ? 'Pending'
                      : `${event.status} ${event.statusText || ''}`.trim()}
                  </span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Resource Type</span>
                  <span className="text-slate-200 capitalize">{event.resourceType || 'other'}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Host</span>
                  <span className="text-slate-200">{event.hostname || '—'}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Timing</span>
                  <span className="text-slate-200">
                    {event.durationMs !== null ? `${event.durationMs} ms` : '—'}
                  </span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Size</span>
                  <span className="text-slate-200">{formatBytes(event.sizeBytes)}</span>
                </div>
                <div className="p-2 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">Timestamp</span>
                  <span className="text-slate-400 font-sans text-[10px]">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Error block if failed */}
            {event.error && (
              <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-md flex items-start gap-2.5">
                <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold text-rose-300">Failure Reason</span>
                  <p className="text-[11px] text-rose-200/90 font-mono break-all">{event.error}</p>
                </div>
              </div>
            )}

            {/* Security banner */}
            <div className="p-2.5 bg-[#141720] border border-[#232732] rounded-md flex items-center gap-2 text-[10px] text-slate-400">
              <Shield size={13} className="text-emerald-400 shrink-0" />
              <span>Sensitive authorization credentials and cookies are automatically redacted.</span>
            </div>
          </div>
        )}

        {/* HEADERS TAB */}
        {activeTab === 'headers' && (
          <div className="space-y-4">
            {/* Response Headers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Response Headers ({resHeaders.length})
                </h4>
              </div>
              {resHeaders.length === 0 ? (
                <div className="p-3 text-center text-slate-500 bg-[#141720] border border-[#232732] rounded-md text-[11px]">
                  No response headers recorded
                </div>
              ) : (
                <div className="bg-[#141720] border border-[#232732] rounded-md divide-y divide-[#1e222d] font-mono text-[11px] overflow-hidden">
                  {resHeaders.map(([key, val]) => (
                    <div key={key} className="p-2 flex flex-col gap-0.5">
                      <span className="text-sky-400 text-[10px]">{key}</span>
                      <span className={cn('break-all select-all', val === '••••••••' ? 'text-amber-400 font-bold' : 'text-slate-300')}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request Headers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                  Request Headers ({reqHeaders.length})
                </h4>
              </div>
              {reqHeaders.length === 0 ? (
                <div className="p-3 text-center text-slate-500 bg-[#141720] border border-[#232732] rounded-md text-[11px]">
                  No request headers recorded
                </div>
              ) : (
                <div className="bg-[#141720] border border-[#232732] rounded-md divide-y divide-[#1e222d] font-mono text-[11px] overflow-hidden">
                  {reqHeaders.map(([key, val]) => (
                    <div key={key} className="p-2 flex flex-col gap-0.5">
                      <span className="text-sky-400 text-[10px]">{key}</span>
                      <span className={cn('break-all select-all', val === '••••••••' ? 'text-amber-400 font-bold' : 'text-slate-300')}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PARAMS TAB */}
        {activeTab === 'params' && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Query Parameters ({queryParams.length})
            </h4>
            {queryParams.length === 0 ? (
              <div className="p-4 text-center text-slate-500 bg-[#141720] border border-[#232732] rounded-md text-[11px]">
                No query parameters in this request
              </div>
            ) : (
              <div className="bg-[#141720] border border-[#232732] rounded-md divide-y divide-[#1e222d] font-mono text-[11px] overflow-hidden">
                {queryParams.map((param, idx) => (
                  <div key={`${param.key}-${idx}`} className="p-2 flex flex-col gap-0.5">
                    <span className="text-sky-400 text-[10px]">{param.key}</span>
                    <span className="text-slate-300 break-all select-all">{param.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const NetworkInspector = memo(NetworkInspectorComponent);
export default NetworkInspector;

