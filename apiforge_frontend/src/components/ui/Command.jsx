import React from 'react';
import { cn } from '../../utils/cn';

export default function Command({ children, className }) {
  return (
    <div className={cn('bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl', className)}>
      {children}
    </div>
  );
}
