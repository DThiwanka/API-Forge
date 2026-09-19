import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const VARIANT_MAP = {
  info: {
    icon: Info,
    container: 'bg-[#111622] border-sky-500/30 text-sky-200',
    iconColor: 'text-sky-400',
    titleColor: 'text-sky-300',
  },
  success: {
    icon: CheckCircle2,
    container: 'bg-[#101915] border-emerald-500/30 text-emerald-200',
    iconColor: 'text-emerald-400',
    titleColor: 'text-emerald-300',
  },
  warning: {
    icon: AlertTriangle,
    container: 'bg-[#1d1710] border-amber-500/30 text-amber-200',
    iconColor: 'text-amber-400',
    titleColor: 'text-amber-300',
  },
  error: {
    icon: AlertCircle,
    container: 'bg-[#1d1013] border-rose-500/40 text-rose-200',
    iconColor: 'text-rose-400',
    titleColor: 'text-rose-300',
  },
};

/**
 * Reusable inline alert for persistent contextual notices and warnings
 */
export default function Alert({
  variant = 'info',
  title,
  children,
  action,
  onDismiss,
  className,
}) {
  const config = VARIANT_MAP[variant] || VARIANT_MAP.info;
  const IconComponent = config.icon;
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex items-start justify-between gap-3 p-3 rounded-lg border text-xs leading-relaxed select-text transition-all',
        config.container,
        className
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <IconComponent size={15} className={cn('shrink-0 mt-0.5', config.iconColor)} />
        <div className="min-w-0 flex-1 space-y-0.5">
          {title && <div className={cn('font-semibold text-xs', config.titleColor)}>{title}</div>}
          {children && <div className="text-[11px] text-slate-300 break-words">{children}</div>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

