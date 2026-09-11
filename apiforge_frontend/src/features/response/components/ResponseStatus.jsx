import { cn } from '../../../utils/cn';

export default function ResponseStatus({ status, statusText, className }) {
  if (!status) return null;

  let variant = 'text-slate-300 bg-slate-800 border-slate-700';
  if (status >= 200 && status < 300) {
    variant = 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
  } else if (status >= 300 && status < 400) {
    variant = 'text-sky-400 bg-sky-950/60 border-sky-800/60';
  } else if (status >= 400 && status < 500) {
    variant = 'text-amber-400 bg-amber-950/60 border-amber-800/60';
  } else if (status >= 500) {
    variant = 'text-rose-400 bg-rose-950/60 border-rose-800/60';
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-bold select-none',
        variant,
        className
      )}
    >
      <span>{status}</span>
      {statusText && <span className="font-sans font-medium text-[11px] opacity-90">{statusText}</span>}
    </div>
  );
}

