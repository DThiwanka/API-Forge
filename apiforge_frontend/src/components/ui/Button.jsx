import React from 'react';
import { cn } from '../../utils/cn';

export default function Button({ children, className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-400',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-slate-400',
    outline: 'border border-slate-600 hover:bg-slate-800 text-slate-200',
    ghost: 'hover:bg-slate-800 text-slate-300 hover:text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-400',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-md font-medium text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant] || variants.primary,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
