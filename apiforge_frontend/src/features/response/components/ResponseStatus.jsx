import { cn } from '../../../utils/cn';
import { getStatusStyles } from '../utils/responseStatusUtils';

export default function ResponseStatus({ status, statusText, className }) {
  if (!status) return null;

  const styles = getStatusStyles(status);

  return (
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
  );
}
