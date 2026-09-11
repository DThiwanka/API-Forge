import React from 'react';
import { cn } from '../../utils/cn';

export default function Select({ children, className, ...props }) {
  return (
    <select
      className={cn(
        'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
