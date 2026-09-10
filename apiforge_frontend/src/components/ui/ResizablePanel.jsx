import React from 'react';
import { cn } from '../../utils/cn';

export default function ResizablePanel({ children, className, width }) {
  return (
    <div className={cn('relative flex-shrink-0 overflow-auto', className)} style={{ width }}>
      {children}
    </div>
  );
}
