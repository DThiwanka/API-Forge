import React from 'react';
import { Search, X } from 'lucide-react';

export default function CommandSearch({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onClear,
}) {
  return (
    <div className="flex items-center px-3.5 py-3 border-b border-[#232732] bg-[#14171f]/80 gap-2.5">
      <Search size={15} className="text-slate-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search requests, collections, environments, history, commands..."
        aria-label="Search requests, collections, environments, history, and commands"
        role="combobox"
        aria-expanded={true}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-controls="command-center-results"
        className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          title="Clear search"
          aria-label="Clear search"
          className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-[#1f2430] transition-colors focus:outline-none cursor-pointer"
        >
          <X size={13} />
        </button>
      ) : (
        <kbd className="px-1.5 py-0.5 rounded bg-[#1c212c] border border-[#2b313e] font-mono text-[10px] text-slate-400 shrink-0">
          Esc
        </kbd>
      )}
    </div>
  );
}

