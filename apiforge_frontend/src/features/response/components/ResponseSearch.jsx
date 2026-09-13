import { forwardRef } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../utils/cn';

const ResponseSearch = forwardRef(function ResponseSearch(
  {
    query = '',
    onChange,
    onClear,
    onNext,
    onPrev,
    matchCount = 0,
    currentMatchIndex = 0,
    className,
  },
  ref
) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev?.();
      } else {
        onNext?.();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClear?.();
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={12} className="absolute left-2.5 text-slate-500 pointer-events-none" />
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in response... (Ctrl+F)"
        className="h-7 pl-7 pr-28 bg-[#111318] border border-[#2b313e] rounded text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 w-48 transition-all focus:w-64"
      />

      {query && (
        <div className="absolute right-1.5 flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <span>
            {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0'}
          </span>

          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount === 0}
            className="p-0.5 rounded hover:bg-[#232732] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp size={12} />
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0}
            className="p-0.5 rounded hover:bg-[#232732] text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next match (Enter)"
          >
            <ChevronDown size={12} />
          </button>

          <button
            type="button"
            onClick={onClear}
            className="text-slate-500 hover:text-slate-300 ml-0.5"
            title="Clear search (Esc)"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
});

export default ResponseSearch;
