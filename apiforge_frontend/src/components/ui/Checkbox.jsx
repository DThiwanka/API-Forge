import React from 'react';
import { cn } from '../../utils/cn';

export default function Checkbox({ className, label, id, ...props }) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer text-slate-200 text-sm">
      <input
        type="checkbox"
        id={id}
        className={cn('rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500', className)}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  );
}
