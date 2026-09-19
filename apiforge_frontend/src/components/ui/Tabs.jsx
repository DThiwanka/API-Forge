import React, { useRef } from 'react';
import { cn } from '../../utils/cn';

export default function Tabs({ tabs = [], activeTab, onTabChange, className, 'aria-label': ariaLabel = 'Tabs' }) {
  const tabRefs = useRef([]);

  const handleKeyDown = (e, index) => {
    if (tabs.length <= 1) return;
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== index) {
      tabRefs.current[nextIndex]?.focus();
      onTabChange?.(tabs[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex border-b border-slate-700 space-x-2', className)}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange?.(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer focus:outline-none',
              isActive
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
