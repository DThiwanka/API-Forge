import { FlaskConical } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { getStatusStyles } from '../utils/responseStatusUtils';

export default function ResponseStatus({ status, statusText, onCreateTest, className }) {
  if (!status) return null;

  const styles = getStatusStyles(status);

  return (
    <div className="inline-flex items-center gap-1.5">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-bold select-none',
          styles.badge,
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
        <span>{status}</span>
        {statusText && <span className="font-sans font-medium text-[11px] opacity-90">{statusText}</span>}
      </div>

      {onCreateTest && (
        <button
          type="button"
          onClick={() => onCreateTest(status)}
          title={`Create test assertion for status ${status}`}
          className="p-1 rounded bg-[#181b22] hover:bg-[#222734] border border-[#2b313e] text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
        >
          <FlaskConical size={12} />
        </button>
      )}
    </div>
  );
}
