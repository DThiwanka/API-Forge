import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export default function Tooltip({ text, children, className }) {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className={cn(
            'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-950 text-white text-xs rounded shadow whitespace-nowrap z-50 pointer-events-none',
            className
          )}
        >
          {text}
        </div>
      )}
    </div>
  );
}
