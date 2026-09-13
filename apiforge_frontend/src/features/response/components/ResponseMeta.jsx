import { Clock, HardDrive, FileCode, FlaskConical } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatTime, formatSize } from '../utils/responseFormatters';

export default function ResponseMeta({
  timeMs,
  sizeBytes,
  contentType,
  onCreateTimeTest,
  className,
}) {
  const cleanContentType = contentType ? contentType.split(';')[0].trim() : null;

  return (
    <div className={cn('flex items-center gap-3 text-xs text-slate-400 font-mono select-none', className)}>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1" title="Round-trip response time">
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

      <div className="flex items-center gap-1" title="Response payload size">
        <HardDrive size={12} className="text-slate-500" />
        <span>{formatSize(sizeBytes)}</span>
      </div>

      {cleanContentType && (
        <div className="flex items-center gap-1" title={contentType}>
          <FileCode size={12} className="text-slate-500" />
          <span className="truncate max-w-[120px]">{cleanContentType}</span>
        </div>
      )}
    </div>
  );
}
