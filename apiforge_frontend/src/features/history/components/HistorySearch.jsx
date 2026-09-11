import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import useDebounce from '../../../hooks/useDebounce';
import { cn } from '../../../utils/cn';

export default function HistorySearch({ value = '', onChange, placeholder = 'Search history by URL or request name...', className }) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const debouncedSearch = useDebounce(searchTerm, 300);
  const inputRef = useRef(null);

  // Sync internal search with prop value if prop changes externally (e.g. on reset)
  if (prevValue !== value) {
    setPrevValue(value);
    setSearchTerm(value);
  }

  // Trigger parent onChange when debounced search value updates
  useEffect(() => {
    if (debouncedSearch !== value) {
      onChange(debouncedSearch);
    }
  }, [debouncedSearch, onChange, value]);

  // Global keyboard shortcut: '/' focuses search input
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === '/' &&
        document.activeElement !== inputRef.current &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
        !document.activeElement?.isContentEditable
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    setSearchTerm('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchTerm) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
    }
  };

  return (
    <div className={cn('relative flex items-center w-full max-w-md', className)}>
      <Search
        size={14}
        className="absolute left-2.5 text-slate-500 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search execution history"
        className="w-full pl-8 pr-16 py-1.5 bg-[#0f1117] border border-[#232732] focus:border-sky-500/60 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors"
      />
      <div className="absolute right-2 flex items-center gap-1">
        {searchTerm ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1a1d26] transition-colors"
            title="Clear search"
          >
            <X size={12} />
          </button>
        ) : (
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-[#181b22] border border-[#2b313e] font-mono text-[10px] text-slate-400 select-none">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
