import { memo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

const ROLE_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'OWNER', label: 'Owners' },
  { id: 'ADMIN', label: 'Admins' },
  { id: 'MEMBER', label: 'Members' },
  { id: 'VIEWER', label: 'Viewers' },
];

function MemberFiltersComponent({
  searchQuery,
  onSearchChange,
  selectedRoleFilter,
  onRoleFilterChange,
  counts = {},
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
      {/* Role filter buttons */}
      <div className="flex items-center gap-1 overflow-x-auto p-0.5 rounded-lg bg-[#141720] border border-[#232732] shrink-0">
        {ROLE_FILTERS.map((f) => {
          const count = counts[f.id.toLowerCase()] ?? 0;
          const isActive = selectedRoleFilter === f.id;

          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onRoleFilterChange(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0',
                isActive
                  ? 'bg-[#1e2330] text-sky-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#181b24]'
              )}
            >
              <span>{f.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                  isActive ? 'bg-sky-950/80 text-sky-300' : 'bg-[#1b1f2b] text-slate-500'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="relative flex items-center min-w-[200px] sm:w-64">
        <Search size={13} className="absolute left-2.5 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by name or email..."
          className="w-full pl-8 pr-7 py-1.5 bg-[#0e1017] border border-[#262c3b] rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/70 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 text-slate-500 hover:text-slate-300 p-0.5"
            title="Clear filter"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export const MemberFilters = memo(MemberFiltersComponent);
export default MemberFilters;

