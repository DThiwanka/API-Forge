import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  RotateCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Variable,
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import RunnerExtractionResult from './RunnerExtractionResult';

const METHOD_COLORS = {
  GET: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  POST: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  PUT: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
  PATCH: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
  DELETE: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
  HEAD: 'text-teal-400 bg-teal-950/40 border-teal-800/40',
  OPTIONS: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
};

function formatDuration(ms) {
  if (typeof ms !== 'number') return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || bytes === 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RunnerResults({
  runData,
  workspaceId,
  collectionId,
  onRunAgain,
  disabled = false,
  className,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'PASSED' | 'FAILED' | 'SKIPPED'
  const [expandedItemIds, setExpandedItemIds] = useState(new Set());

  const summary = runData?.summary || {
    total: 0,
    completed: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    status: 'COMPLETED',
  };

  const metadata = runData?.metadata || {};
  const results = runData?.results || [];

  const allExtractedVars = useMemo(() => {
    const list = runData?.results || [];
    const set = new Set();
    for (const r of list) {
      if (r.extraction?.success && Array.isArray(r.extraction.variables)) {
        for (const v of r.extraction.variables) {
          if (v) set.add(v);
        }
      }
    }
    return Array.from(set);
  }, [runData?.results]);

  const toggleExpand = (id) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredResults = useMemo(() => {
    const list = runData?.results || [];
    if (filter === 'PASSED') return list.filter((r) => r.success);
    if (filter === 'FAILED') return list.filter((r) => !r.success && !r.skipped);
    if (filter === 'SKIPPED') return list.filter((r) => r.skipped);
    return list;
  }, [runData?.results, filter]);

  const handleOpenRequest = (requestId) => {
    navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`);
  };

  return (
    <div className={cn('flex flex-col h-full bg-[#0c0e14] overflow-hidden', className)}>
      {/* Top Run Summary Banner */}
      <div className="p-4 bg-[#10131b] border-b border-[#232732] space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {summary.status === 'COMPLETED' && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 size={13} />
                <span>Run Completed</span>
              </div>
            )}
            {summary.status === 'STOPPED' && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-600/40 text-amber-400 text-xs font-semibold">
                <AlertTriangle size={13} />
                <span>Halted on Error</span>
              </div>
            )}
            {summary.status === 'FAILED' && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-600/40 text-rose-400 text-xs font-semibold">
                <XCircle size={13} />
                <span>Run with Failures</span>
              </div>
            )}

            {metadata.environmentName && (
              <span className="text-[11px] font-mono text-slate-400 bg-[#171a24] px-2 py-0.5 rounded border border-[#2b3140]">
                Env: {metadata.environmentName}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onRunAgain}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RotateCw size={12} />
            <span>Run Again</span>
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2 rounded bg-[#151822] border border-[#232732] text-center">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Total</div>
            <div className="text-base font-semibold text-slate-100 font-mono mt-0.5">{summary.total}</div>
          </div>

          <div className="p-2 rounded bg-[#151822] border border-[#232732] text-center">
            <div className="text-emerald-400 text-[10px] font-medium uppercase tracking-wider">Passed</div>
            <div className="text-base font-semibold text-emerald-400 font-mono mt-0.5">{summary.passed}</div>
          </div>

          <div className="p-2 rounded bg-[#151822] border border-[#232732] text-center">
            <div className="text-rose-400 text-[10px] font-medium uppercase tracking-wider">Failed</div>
            <div className="text-base font-semibold text-rose-400 font-mono mt-0.5">{summary.failed}</div>
          </div>

          <div className="p-2 rounded bg-[#151822] border border-[#232732] text-center">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider">Skipped</div>
            <div className="text-base font-semibold text-slate-400 font-mono mt-0.5">{summary.skipped}</div>
          </div>

          <div className="p-2 rounded bg-[#151822] border border-[#232732] text-center col-span-2 sm:col-span-1">
            <div className="text-slate-400 text-[10px] font-medium uppercase tracking-wider flex items-center justify-center gap-1">
              <Clock size={10} />
              <span>Duration</span>
            </div>
            <div className="text-base font-semibold text-sky-400 font-mono mt-0.5">
              {formatDuration(summary.durationMs)}
            </div>
          </div>
        </div>

        {/* Chained Runtime Variables Summary (if any were extracted) */}
        {allExtractedVars.length > 0 && (
          <div className="p-2.5 rounded bg-[#131722] border border-[#232938] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Variable size={13} />
                <span>Chained Variables ({allExtractedVars.length}):</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {allExtractedVars.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-mono text-[11px]"
                    title={`Extracted and available as {{${v}}}`}
                  >
                    &#123;&#123;{v}&#125;&#125;
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              Extracted during run &amp; piped downstream
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-1.5 bg-[#0f1219] border-b border-[#232732] flex items-center gap-2 text-xs shrink-0 select-none">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={cn(
            'px-2.5 py-1 rounded text-xs transition-colors',
            filter === 'ALL'
              ? 'bg-[#1e2330] text-slate-100 font-medium'
              : 'text-slate-400 hover:text-slate-200'
          )}
        >
          All ({results.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('PASSED')}
          className={cn(
            'px-2.5 py-1 rounded text-xs transition-colors',
            filter === 'PASSED'
              ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-medium'
              : 'text-slate-400 hover:text-emerald-400'
          )}
        >
          Passed ({summary.passed})
        </button>

        <button
          type="button"
          onClick={() => setFilter('FAILED')}
          className={cn(
            'px-2.5 py-1 rounded text-xs transition-colors',
            filter === 'FAILED'
              ? 'bg-rose-950/40 border border-rose-800/40 text-rose-300 font-medium'
              : 'text-slate-400 hover:text-rose-400'
          )}
        >
          Failed ({summary.failed})
        </button>

        {summary.skipped > 0 && (
          <button
            type="button"
            onClick={() => setFilter('SKIPPED')}
            className={cn(
              'px-2.5 py-1 rounded text-xs transition-colors',
              filter === 'SKIPPED'
                ? 'bg-slate-800 text-slate-200 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            Skipped ({summary.skipped})
          </button>
        )}
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1b1f2b] p-3 space-y-1">
        {filteredResults.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 italic">
            No results match the selected filter.
          </div>
        ) : (
          filteredResults.map((item, index) => {
            const isExpanded = expandedItemIds.has(item.id || index);
            const methodStyle = METHOD_COLORS[item.method] || 'text-slate-400 bg-slate-900 border-slate-700';

            return (
              <div
                key={item.id || index}
                className="bg-[#10131c] border border-[#202534] rounded-md overflow-hidden transition-colors"
              >
                {/* Result Row Header */}
                <div
                  onClick={() => toggleExpand(item.id || index)}
                  className="px-3 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#141824] transition-colors select-none text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>

                    {/* Status Icon */}
                    {item.skipped ? (
                      <span className="text-slate-500" title="Skipped">
                        <MinusCircle size={15} />
                      </span>
                    ) : item.success ? (
                      <span className="text-emerald-400" title="Success">
                        <CheckCircle2 size={15} />
                      </span>
                    ) : (
                      <span className="text-rose-400" title="Failed">
                        <XCircle size={15} />
                      </span>
                    )}

                    {/* Method */}
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded font-mono text-[9px] font-bold border shrink-0',
                        methodStyle
                      )}
                    >
                      {item.method}
                    </span>

                    {/* Request Name */}
                    <span className="font-medium text-slate-200 truncate">{item.name}</span>

                    {/* Evaluated URL */}
                    <span className="text-slate-500 font-mono text-[11px] truncate hidden md:inline">
                      {item.url}
                    </span>
                  </div>

                  {/* Right Metrics: Status Code & Time */}
                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-xs">
                    {/* Extraction badge if present */}
                    {item.extraction && (
                      item.extraction.success ? (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 flex items-center gap-1 shrink-0"
                          title={`Extracted variables: ${(item.extraction.variables || []).join(', ')}`}
                        >
                          <Variable size={10} />
                          <span>
                            {item.extraction.variables?.length || 0}{' '}
                            {item.extraction.variables?.length === 1 ? 'var' : 'vars'}
                          </span>
                        </span>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-rose-400 bg-rose-950/50 border border-rose-800/50 flex items-center gap-1 shrink-0"
                          title={item.extraction.error || 'Extraction failed'}
                        >
                          <Variable size={10} />
                          <span>Extraction failed</span>
                        </span>
                      )
                    )}

                    {item.skipped ? (
                      <span className="text-[11px] text-slate-500 italic">Skipped</span>
                    ) : item.status !== null ? (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[11px] font-semibold border',
                          item.status >= 200 && item.status < 300
                            ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                            : item.status >= 400
                            ? 'text-rose-400 bg-rose-950/40 border-rose-800/40'
                            : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                        )}
                      >
                        {item.status} {item.statusText || ''}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] text-rose-400 bg-rose-950/40 border border-rose-800/40 font-semibold">
                        {item.errorType || 'ERROR'}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 w-16 text-right">
                      {item.skipped ? '-' : formatDuration(item.duration ?? item.timeMs)}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-[#0c0e15] border-t border-[#1d2230] space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="text-[11px] text-slate-400 font-medium">Evaluated Target URL</div>
                        <div className="p-2 rounded bg-[#131620] border border-[#232732] font-mono text-[11px] text-slate-300 break-all select-all">
                          {item.url}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRequest(item.id);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2330] hover:bg-[#282f42] text-slate-300 hover:text-white border border-[#2b3140] transition-colors shrink-0 text-xs mt-4"
                        title="Navigate to this request in Request Workspace"
                      >
                        <ExternalLink size={12} />
                        <span>Open Request</span>
                      </button>
                    </div>

                    {/* Additional Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      {item.sizeBytes && (
                        <div>
                          Size: <span className="font-mono text-slate-300">{formatBytes(item.sizeBytes)}</span>
                        </div>
                      )}
                      {item.contentType && (
                        <div>
                          Content-Type: <span className="font-mono text-slate-300">{item.contentType}</span>
                        </div>
                      )}
                    </div>

                    {/* Variable Extraction Result if defined */}
                    {item.extraction && (
                      <div className="pt-2">
                        <RunnerExtractionResult extraction={item.extraction} />
                      </div>
                    )}

                    {/* Error Diagnostics if failed */}
                    {!item.success && !item.skipped && item.errorMessage && (
                      <div className="mt-2 p-2.5 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300 text-[11px] font-mono space-y-1">
                        <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle size={12} />
                          <span>{item.errorType || 'EXECUTION_ERROR'}</span>
                        </div>
                        <div className="break-all">{item.errorMessage}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
