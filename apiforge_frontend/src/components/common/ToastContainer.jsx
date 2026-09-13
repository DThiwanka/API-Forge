import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import useToastStore from '../../stores/toastStore';
import { cn } from '../../utils/cn';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-8 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border shadow-xl text-xs backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-150',
              isSuccess && 'bg-[#101915]/95 border-emerald-500/40 text-emerald-200',
              isError && 'bg-[#1f1013]/95 border-rose-500/40 text-rose-200',
              isWarning && 'bg-[#1f1910]/95 border-amber-500/40 text-amber-200',
              !isSuccess && !isError && !isWarning && 'bg-[#14171f]/95 border-[#2b313e] text-slate-200'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isSuccess && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
              {isError && <AlertCircle size={14} className="text-rose-400 shrink-0" />}
              {isWarning && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info size={14} className="text-sky-400 shrink-0" />}
              <span className="truncate">{t.message}</span>
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

