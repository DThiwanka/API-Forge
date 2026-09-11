import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock, HardDrive, X } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return null;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function TestResult({ result, onDismiss }) {
  if (!result) return null;

  const {
    passed,
    total,
    passedCount,
    duration,
    response,
    errorType,
    errorMessage,
  } = result;

  const isExecutionFailure = Boolean(errorType);

  return (
    <div
      className={`rounded-md border p-3 text-xs mb-3 font-sans transition-colors ${
        isExecutionFailure
          ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
          : passed
          ? 'bg-emerald-950/25 border-emerald-800/50 text-emerald-200'
          : 'bg-rose-950/25 border-rose-800/50 text-rose-200'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 font-medium">
          {isExecutionFailure ? (
            <AlertTriangle size={15} className="text-amber-400 flex-shrink-0" />
          ) : passed ? (
            <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle size={15} className="text-rose-400 flex-shrink-0" />
          )}

          <span className="font-semibold text-sm">
            {isExecutionFailure
              ? 'Execution Error'
              : passed
              ? 'Test Passed'
              : 'Test Failed'}
          </span>

          {!isExecutionFailure && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#14171f] border border-[#232732] text-slate-300">
              {passedCount} / {total} assertions passed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {duration !== undefined && duration !== null && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <Clock size={11} />
              <span>{duration}ms</span>
            </div>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f2430] transition-colors"
              title="Dismiss Result"
              aria-label="Dismiss Result"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Execution Error Details */}
      {isExecutionFailure && (
        <div className="mt-1 p-2 rounded bg-[#101217] border border-amber-900/40 text-[11px] font-mono flex flex-col gap-1 text-amber-300">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold uppercase text-[10px]">
              {errorType}
            </span>
            <span className="text-slate-300">{errorMessage || 'Request failed before assertions could execute'}</span>
          </div>
        </div>
      )}

      {/* HTTP Response Metadata Pill (when executed against a server) */}
      {response && (
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1 pt-1.5 border-t border-slate-800/40">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <span
              className={`font-semibold ${
                response.status >= 200 && response.status < 300
                  ? 'text-emerald-400'
                  : response.status >= 400
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {response.status} {response.statusText || ''}
            </span>
          </div>

          {response.timeMs !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Latency:</span>
              <span className="text-slate-300">{response.timeMs}ms</span>
            </div>
          )}

          {response.sizeBytes !== undefined && response.sizeBytes !== null && (
            <div className="flex items-center gap-1">
              <HardDrive size={10} className="text-slate-500" />
              <span className="text-slate-300">{formatBytes(response.sizeBytes)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
