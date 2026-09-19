import React from 'react';
import { cn } from '../../utils/cn';

export default function Switch({ checked, onChange, className, label, 'aria-label': ariaLabel, id }) {
  const switchLabel = ariaLabel || label || 'Toggle switch';

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        aria-label={switchLabel}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          checked ? 'bg-blue-600' : 'bg-slate-700',
          className
        )}
      >
        <span
          className={cn(
            'bg-white w-4 h-4 rounded-full shadow-md transform transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      {label && (
        <span
          onClick={() => onChange?.(!checked)}
          className="text-sm text-slate-200 cursor-pointer"
        >
          {label}
        </span>
      )}
    </div>
  );
}
