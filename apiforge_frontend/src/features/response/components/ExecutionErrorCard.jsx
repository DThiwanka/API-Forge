import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  WifiOff,
  RotateCw,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

/**
 * Execution Error Card Component
 * 
 * Provides a compact, professional presentation for non-HTTP execution failures:
 * - Timeouts
 * - SSRF & Security Blocks
 * - Network / DNS Failures
 * - Client Validation Errors
 * 
 * Includes contextual suggestions and a safe one-click Retry action.
 */
export default function ExecutionErrorCard({
  error = null,
  onRetry,
  isRetrying = false,
  className,
}) {
  if (!error) return null;

  const errorType = error.type || 'UNKNOWN';

  // Determine type-specific icon and theme
  let IconComponent = AlertTriangle;
  let borderTheme = 'border-rose-800/60 bg-rose-950/20';
  let badgeTheme = 'bg-rose-900/40 text-rose-300 border-rose-700/50';
  let titleColor = 'text-rose-400';

  if (errorType === 'TIMEOUT') {
    IconComponent = Clock;
    borderTheme = 'border-amber-800/50 bg-amber-950/20';
    badgeTheme = 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    titleColor = 'text-amber-400';
  } else if (errorType === 'SECURITY') {
    IconComponent = ShieldAlert;
    borderTheme = 'border-rose-900/60 bg-rose-950/30';
    badgeTheme = 'bg-rose-900/50 text-rose-200 border-rose-700/60';
    titleColor = 'text-rose-400';
  } else if (errorType === 'NETWORK') {
    IconComponent = WifiOff;
    borderTheme = 'border-sky-800/50 bg-sky-950/20';
    badgeTheme = 'bg-sky-900/40 text-sky-300 border-sky-700/50';
    titleColor = 'text-sky-400';
  }

  const suggestions = Array.isArray(error.suggestions) && error.suggestions.length > 0
    ? error.suggestions
    : [
        'Check that all {{variables}} are defined in your active environment.',
        'Ensure the target server is reachable and accepting network connections.',
        'Verify that the URL protocol is http:// or https://.',
      ];

  return (
    <div className={cn('flex-1 flex flex-col p-6 overflow-auto', className)}>
      <div className={cn('rounded-lg border p-5 space-y-4 shadow-lg select-text', borderTheme)}>
        {/* Header: Icon + Title + Type Badge */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className={cn('p-2 rounded-md bg-[#0d0f14]/80 border border-[#232732]', titleColor)}>
              <IconComponent size={20} />
            </div>
            <div>
              <h3 className={cn('text-sm font-semibold tracking-wide', titleColor)}>
                {error.title || 'Request Execution Failed'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {error.status ? `Status: ${error.status}` : 'Execution transport failure'}
              </p>
            </div>
          </div>

          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border',
              badgeTheme
            )}
          >
            Type: {errorType}
          </span>
        </div>

        {/* Error Message */}
        <div className="p-3 rounded bg-[#0d0f14]/90 border border-[#232732] text-xs font-mono text-rose-200 leading-relaxed break-words">
          {error.message || 'An unexpected error occurred during request execution.'}
        </div>

        {/* Troubleshooting Suggestions */}
        <div className="pt-2 border-t border-[#232732] text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-[11px] uppercase tracking-wider">
            <HelpCircle size={13} className="text-sky-400" />
            <span>Troubleshooting Recommendations:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 font-sans text-xs">
            {suggestions.map((suggestion, idx) => (
              <li key={idx} className="leading-normal">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        {/* Retry Action Bar */}
        {onRetry && (
          <div className="pt-3 border-t border-[#232732] flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[11px] text-slate-500 font-sans">
              Retry executes with the current request draft and active environment.
            </span>

            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-sm cursor-pointer select-none"
            >
              <RotateCw size={13} className={cn(isRetrying && 'animate-spin')} />
              <span>{isRetrying ? 'Retrying...' : 'Retry Request'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

