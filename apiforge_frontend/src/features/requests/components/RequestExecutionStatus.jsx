import { cn } from '../../../utils/cn';
import { formatTime } from '../../response/utils/responseFormatters';

/**
 * Compact Execution Lifecycle Status Indicator
 * 
 * Visually communicates the execution state of the active request:
 * - Ready
 * - Sending... (live timer)
 * - Response received (HTTP status + duration)
 * - Execution failed (error category)
 */
export default function RequestExecutionStatus({
  isExecuting = false,
  status = 'idle',
  response = null,
  error = null,
  elapsedMs = 0,
  className,
}) {
  // 1. Executing / Loading State
  if (isExecuting || status === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-950/60 border border-sky-500/40 text-sky-300 select-none shadow-sm',
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
        </span>
        <span>Sending...</span>
        <span className="text-sky-400 opacity-80">
          {(Math.max(0, elapsedMs) / 1000).toFixed(2)}s
        </span>
      </div>
    );
  }

  // 2. Success Response Received (2xx, 3xx, 4xx, 5xx)
  if (status === 'success' && response?.status) {
    const code = response.status;
    const is2xx = code >= 200 && code < 300;
    const is3xx = code >= 300 && code < 400;
    const is4xx = code >= 400 && code < 500;
    const is5xx = code >= 500;

    const badgeTheme = is2xx
      ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
      : is3xx
      ? 'bg-sky-950/40 border-sky-600/40 text-sky-300'
      : is4xx
      ? 'bg-amber-950/40 border-amber-600/40 text-amber-300'
      : is5xx
      ? 'bg-rose-950/40 border-rose-600/40 text-rose-300'
      : 'bg-slate-900 border-slate-700 text-slate-300';

    const dotColor = is2xx
      ? 'bg-emerald-400'
      : is3xx
      ? 'bg-sky-400'
      : is4xx
      ? 'bg-amber-400'
      : 'bg-rose-400';

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border select-none',
          badgeTheme,
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
        <span>{code}</span>
        {response.timeMs !== undefined && (
          <span className="opacity-80">· {formatTime(response.timeMs)}</span>
        )}
      </div>
    );
  }

  // 3. Execution Failed State (Transport, SSRF, Timeout)
  if (status === 'error' && error) {
    const errorType = error.type || (error.status === 403 ? 'SECURITY' : error.status === 504 ? 'TIMEOUT' : 'ERROR');

    return (
      <div
        role="status"
        aria-live="assertive"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-950/40 border border-rose-800/60 text-rose-300 select-none',
          className
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        <span>Failed: {errorType}</span>
      </div>
    );
  }

  // 4. Idle Ready State
  return (
    <div
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-[#14171f] border border-[#232732] select-none',
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      <span>Ready</span>
    </div>
  );
}

