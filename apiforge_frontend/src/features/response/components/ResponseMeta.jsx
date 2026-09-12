import { Clock, HardDrive, FileCode } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatTime, formatSize } from '../utils/responseFormatters';

export default function ResponseMeta({ timeMs, sizeBytes, contentType, className }) {
  const cleanContentType = contentType ? contentType.split(';')[0].trim() : null;

  return (
    <div className={cn('flex items-center gap-3 text-xs text-slate-400 font-mono select-none', className)}>
      <div className="flex items-center gap-1" title="Round-trip response time">
        <Clock size={12} className="text-slate-500" />
        <span>{formatTime(timeMs)}</span>
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
