import { Clock, HardDrive, FileCode } from 'lucide-react';
import { cn } from '../../../utils/cn';

function formatTime(ms) {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatSize(bytes) {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

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

