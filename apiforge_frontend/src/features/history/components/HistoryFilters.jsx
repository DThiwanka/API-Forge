import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '../../../utils/cn';

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'All' },
  { id: '2xx', label: '2xx', badge: 'text-emerald-400' },
  { id: '3xx', label: '3xx', badge: 'text-sky-400' },
  { id: '4xx', label: '4xx', badge: 'text-amber-400' },
  { id: '5xx', label: '5xx', badge: 'text-rose-400' },
];

const METHOD_OPTIONS = [
  'ALL',
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

export default function HistoryFilters({
  statusFilter = 'ALL',
  onStatusChange,
  methodFilter = 'ALL',
  onMethodChange,
  hasActiveFilters,
  onReset,
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 select-none text-xs', className)}>
      {/* Status Segmented Controls */}
      <div className="flex items-center p-0.5 rounded bg-[#0d0f14] border border-[#232732]">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = statusFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStatusChange(opt.id)}
              className={cn(
                'px-2.5 py-1 rounded text-[11px] font-medium transition-colors',
                isActive
                  ? 'bg-[#181b22] text-slate-100 border border-[#2b313e] shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <span className={opt.badge}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* HTTP Method Dropdown Selector */}
      <div className="flex items-center">
        <select
          value={methodFilter}
          onChange={(e) => onMethodChange(e.target.value)}
          aria-label="Filter by HTTP method"
          className="bg-[#0f1117] border border-[#232732] focus:border-sky-500/60 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none transition-colors cursor-pointer"
        >
          {METHOD_OPTIONS.map((m) => (
            <option key={m} value={m} className="bg-[#14171f] text-slate-200">
              {m === 'ALL' ? 'All Methods' : m}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filters Action */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#181b22] transition-colors text-[11px]"
          title="Reset all filters"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
