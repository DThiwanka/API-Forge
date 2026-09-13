import { Clock, HardDrive, FileCode, FlaskConical, CornerDownRight } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatTime, formatSize } from '../utils/responseFormatters';

/**
 * Response Metadata Header Component
 * 
 * Displays round-trip response duration, size in bytes, Content-Type,
 * and redirect indicators when the final URL differs from the origin.
 */
export default function ResponseMeta({
  timeMs,
  sizeBytes,
  contentType,
  redirected = false,
  finalUrl = null,
  originalUrl = null,
  onCreateTimeTest,
  className,
}) {
  const cleanContentType = contentType ? contentType.split(';')[0].trim() : null;
  const isRedirected = redirected || (Boolean(finalUrl) && Boolean(originalUrl) && finalUrl !== originalUrl);

  return (
    <div className={cn('flex items-center gap-3 text-xs text-slate-400 font-mono select-none flex-wrap', className)}>
      {/* Response Time */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1" title="Round-trip response duration">
          <Clock size={12} className="text-slate-500" />
          <span>{formatTime(timeMs)}</span>
        </div>

        {onCreateTimeTest && timeMs !== undefined && (
          <button
            type="button"
            onClick={() => onCreateTimeTest(timeMs)}
            title="Create response time assertion"
            className="p-1 rounded bg-[#181b22] hover:bg-[#222734] border border-[#2b313e] text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
          >
            <FlaskConical size={11} />
          </button>
        )}
      </div>

      {/* Response Size */}
      <div className="flex items-center gap-1" title="Response payload size">
        <HardDrive size={12} className="text-slate-500" />
        <span>{formatSize(sizeBytes)}</span>
      </div>

      {/* Content-Type */}
      {cleanContentType && (
        <div className="flex items-center gap-1" title={contentType}>
          <FileCode size={12} className="text-slate-500" />
          <span className="truncate max-w-[120px]">{cleanContentType}</span>
        </div>
      )}

      {/* Redirect Indicator */}
      {isRedirected && (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-600/40 text-[10px] text-amber-300"
          title={finalUrl ? `Redirected to: ${finalUrl}` : 'Request followed redirects to final target'}
        >
          <CornerDownRight size={10} className="text-amber-400" />
          <span>Redirected</span>
        </div>
      )}
    </div>
  );
}
