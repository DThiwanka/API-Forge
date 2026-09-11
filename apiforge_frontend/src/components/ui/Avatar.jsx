import React from 'react';
import { cn } from '../../utils/cn';

export default function Avatar({ src, name, size = 'md', className }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-slate-700 font-medium text-slate-200 border border-slate-600',
        sizeClasses[size],
        className
      )}
    >
      {src ? <img src={src} alt={name || 'Avatar'} className="w-full h-full object-cover" /> : name ? name.charAt(0).toUpperCase() : '?'}
    </div>
  );
}
