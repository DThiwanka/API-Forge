import React from 'react';
import { cn } from '../../utils/cn';

export default function Switch({ checked, onChange, className, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'w-11 h-6 flex items-center rounded-full p-1 transition-colors',
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
      {label && <span className="text-sm text-slate-200">{label}</span>}
    </label>
  );
}
