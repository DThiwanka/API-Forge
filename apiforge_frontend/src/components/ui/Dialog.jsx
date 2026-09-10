import React from 'react';
import { cn } from '../../utils/cn';

export default function Dialog({ isOpen, onClose, title, children, className }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={cn('bg-slate-800 border border-slate-700 rounded-lg max-w-lg w-full p-6 shadow-xl', className)}>
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
