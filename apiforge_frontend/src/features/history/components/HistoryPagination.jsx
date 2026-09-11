import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function HistoryPagination({
  page = 1,
  limit = 20,
  total = 0,
  totalPages = 1,
  onPageChange,
  className,
}) {
  if (total <= 0) return null;

  const start = Math.min((page - 1) * limit + 1, total);
  const end = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-2.5 bg-[#0f1117] border-t border-[#232732] text-xs text-slate-400 select-none',
        className
      )}
    >
      {/* Total records info */}
      <div className="font-mono text-[11px] text-slate-400">
        Showing <span className="text-slate-200 font-semibold">{start}</span>–
        <span className="text-slate-200 font-semibold">{end}</span> of{' '}
        <span className="text-slate-200 font-semibold">{total}</span> executions
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#141720] border border-[#232732] hover:border-[#2f3545] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[#1b202c] transition-colors"
        >
          <ChevronLeft size={13} />
          <span>Previous</span>
        </button>

        <div className="px-2 font-mono text-[11px] text-slate-300">
          Page <span className="font-semibold text-slate-100">{page}</span> of{' '}
          <span className="font-semibold text-slate-100">{totalPages}</span>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#141720] border border-[#232732] hover:border-[#2f3545] text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[#1b202c] transition-colors"
        >
          <span>Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

