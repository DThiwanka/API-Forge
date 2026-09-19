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
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';
        const role = isError || isWarning ? 'alert' : 'status';

        return (
          <div
            key={t.id}
            role={role}
            className={cn(
              'pointer-events-auto flex flex-col gap-2 p-3 rounded-lg border shadow-2xl text-xs backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in duration-150',
              isSuccess && 'bg-[#0f1713]/95 border-emerald-500/40 text-emerald-100',
              isError && 'bg-[#1a0f12]/95 border-rose-500/40 text-rose-100',
              isWarning && 'bg-[#1a140d]/95 border-amber-500/40 text-amber-100',
              !isSuccess && !isError && !isWarning && 'bg-[#12151c]/95 border-[#2b313e] text-slate-100'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {isSuccess && <CheckCircle2 size={15} className="text-emerald-400" />}
                  {isError && <AlertCircle size={15} className="text-rose-400" />}
                  {isWarning && <AlertTriangle size={15} className="text-amber-400" />}
                  {!isSuccess && !isError && !isWarning && <Info size={15} className="text-sky-400" />}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  {t.title && (
                    <div className="font-semibold text-white tracking-wide text-xs leading-tight">
                      {t.title}
                    </div>
                  )}
                  {t.message && (
                    <p className="text-[11px] leading-relaxed text-slate-300 break-words font-sans">
                      {t.message}
                    </p>
                  )}
                </div>
              </div>

              {t.dismissible !== false && (
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {t.action && (
              <div className="flex justify-end pt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      t.action.onClick?.();
                    } finally {
                      removeToast(t.id);
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-[11px] transition-colors cursor-pointer"
                >
                  {t.action.label || 'Action'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
