import React from 'react';
import { cn } from '../../utils/cn';

export default function Badge({ children, variant = 'default', className }) {
  const variants = {
    default: 'bg-slate-700 text-slate-200',
    success: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
    warning: 'bg-amber-900/60 text-amber-300 border border-amber-700',
    danger: 'bg-rose-900/60 text-rose-300 border border-rose-700',
    info: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  };
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', variants[variant] || variants.default, className)}
    >
      {children}
    </span>
  );
}
