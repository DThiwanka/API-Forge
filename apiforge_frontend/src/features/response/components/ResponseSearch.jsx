import { Search, X } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function ResponseSearch({
  query = '',
  onChange,
  onClear,
  matchCount = 0,
  className,
}) {
  return (
    <div className={cn('relative flex items-center', className)}>
      <Search size={12} className="absolute left-2 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find in response..."
        className="h-7 pl-7 pr-14 bg-[#111318] border border-[#2b313e] rounded text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 w-44 transition-all focus:w-56"
      />
      {query && (
        <div className="absolute right-2 flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-400">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-slate-500 hover:text-slate-300 ml-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

