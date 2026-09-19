import React from 'react';
import { AlertCircle, RotateCw, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { normalizeApiError } from '../../utils/errorHandler.js';

/**
 * Full page or section error display component
 */
export default function ErrorState({
  title = 'Something went wrong',
  message,
  error = null,
  onRetry,
  retryLabel = 'Try Again',
  action,
  className,
}) {
  const normalized = error ? normalizeApiError(error) : null;
  const displayTitle = title || (normalized?.category ? `${normalized.category} Error` : 'Something went wrong');
  const displayMessage = message || normalized?.message || 'APIForge could not complete this operation.';

  return (
    <div
      role="alert"
      className={cn(
        'flex-1 flex flex-col items-center justify-center p-8 text-center select-none max-w-md mx-auto',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-rose-950/30 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
        <AlertCircle size={22} />
      </div>

      <h4 className="text-sm font-semibold text-rose-300 mb-1 tracking-wide">
        {displayTitle}
      </h4>

      <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed font-sans">
        {displayMessage}
      </p>

      {/* Safe technical details disclosure */}
      {normalized?.details && Object.keys(normalized.details).length > 0 && (
        <details className="w-full text-left mb-4 p-2 rounded bg-[#11141c] border border-[#232732] text-[11px] font-mono text-slate-400 cursor-pointer">
          <summary className="flex items-center gap-1 font-sans text-slate-300 hover:text-white transition-colors">
            <ChevronDown size={12} />
            <span>Diagnostic Details</span>
          </summary>
          <pre className="mt-2 p-2 bg-[#090b10] rounded text-[10px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(normalized.details, null, 2)}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-2.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-rose-900/40 text-rose-200 border border-rose-700/60 rounded-md hover:bg-rose-900/60 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <RotateCw size={12} />
            <span>{retryLabel}</span>
          </button>
        )}
        {action}
      </div>
    </div>
  );
}
