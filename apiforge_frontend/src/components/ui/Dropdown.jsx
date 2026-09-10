import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export default function Dropdown({ trigger, children, className }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 z-50 p-1 border border-slate-700',
            className
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
