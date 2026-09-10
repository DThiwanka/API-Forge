import React from 'react';
import { cn } from '../../utils/cn';

export default function Tabs({ tabs = [], activeTab, onTabChange, className }) {
  return (
    <div className={cn('flex border-b border-slate-700 space-x-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange?.(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.id
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
