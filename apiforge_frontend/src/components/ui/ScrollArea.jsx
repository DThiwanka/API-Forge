import React from 'react';
import { cn } from '../../utils/cn';

export default function ScrollArea({ children, className }) {
  return (
    <div className={cn('overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent', className)}>
      {children}
    </div>
  );
}
