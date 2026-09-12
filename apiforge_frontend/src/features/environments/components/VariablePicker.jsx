import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Variable, Globe, Lock, ArrowRightLeft, Cpu, Sparkles } from 'lucide-react';
import VariableSourceBadge from './VariableSourceBadge';
import { cn } from '../../../utils/cn';

export default function VariablePicker(props) {
  if (!props.isOpen) return null;
  return <VariablePickerModal {...props} />;
}

function VariablePickerModal({
  onClose,
  onSelect,
  variables = [],
  activeEnvName,
  title = 'Insert Variable',
  className,
}) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter variables by search query (matching key or description only, never secret values)
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return variables;
    return variables.filter(
      (v) =>
        v.key.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
    );
  }, [variables, search]);

  // Group filtered variables by source
  const grouped = useMemo(() => {
    const groups = {
      environment: [],
      extracted: [],
      runtime: [],
    };
    for (const v of filtered) {
      const src = (v.source || 'environment').toLowerCase();
      if (groups[src]) {
        groups[src].push(v);
      } else {
        groups.environment.push(v);
      }
    }
    return groups;
  }, [filtered]);

  // Focus search input when mounted
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setSelectedIndex(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
      return;
    }

    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filtered[selectedIndex];
      if (selected) {
        onSelect?.(selected.key);
        onClose?.();
      }
    }
  };

  let flatCounter = 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'w-full max-w-md bg-[#10131b] border border-[#272d3d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-[#141722] border-b border-[#232838] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Variable size={16} className="text-sky-400" />
            <h3 className="text-xs font-semibold text-slate-100">{title}</h3>
            {activeEnvName ? (
              <span className="text-[10px] font-mono text-slate-400 bg-[#1b202e] px-2 py-0.5 rounded border border-[#2a3248] flex items-center gap-1">
                <Globe size={10} className="text-sky-400" />
                <span>{activeEnvName}</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 bg-[#161922] px-2 py-0.5 rounded border border-[#232734]">
                No Active Env
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-[#1f2434] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#232838] bg-[#0d0f15] shrink-0">
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-3 text-slate-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search variables by name or description..."
              className="w-full bg-[#151824] border border-[#2a3144] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono transition-colors"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Use ↑ ↓ to navigate, Enter to insert</span>
            <span>Esc to cancel</span>
          </div>
        </div>

        {/* Variables List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-1">
              {variables.length === 0 ? (
                <>
                  <Sparkles size={20} className="mx-auto text-slate-600 mb-1" />
                  <p className="text-slate-400 font-medium">No variables available</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Activate an environment or define response extractions to make variables available.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-slate-400">No variables match &quot;{search}&quot;</p>
                  <p className="text-[11px] text-slate-500">Try searching for a different variable name.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Group: Environment */}
              {grouped.environment.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Globe size={11} className="text-sky-400" />
                    <span>Environment Variables ({grouped.environment.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {grouped.environment.map((v) => {
                      const itemIndex = flatCounter++;
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <VariableItemRow
                          key={`env-${v.key}`}
                          variable={v}
                          isSelected={isSelected}
                          onSelect={() => {
                            onSelect?.(v.key);
                            onClose?.();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group: Extracted */}
              {grouped.extracted.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft size={11} className="text-emerald-400" />
                    <span>Extracted Variables ({grouped.extracted.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {grouped.extracted.map((v) => {
                      const itemIndex = flatCounter++;
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <VariableItemRow
                          key={`ext-${v.key}`}
                          variable={v}
                          isSelected={isSelected}
                          onSelect={() => {
                            onSelect?.(v.key);
                            onClose?.();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group: Runtime */}
              {grouped.runtime.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu size={11} className="text-purple-400" />
                    <span>Runtime Variables ({grouped.runtime.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {grouped.runtime.map((v) => {
                      const itemIndex = flatCounter++;
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <VariableItemRow
                          key={`run-${v.key}`}
                          variable={v}
                          isSelected={isSelected}
                          onSelect={() => {
                            onSelect?.(v.key);
                            onClose?.();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VariableItemRow({ variable, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-2 rounded-md transition-colors flex items-start justify-between gap-3 cursor-pointer group select-none border',
        isSelected
          ? 'bg-sky-950/40 border-sky-600/50 text-slate-100'
          : 'bg-[#141722]/60 border-transparent hover:bg-[#191d2a] hover:border-[#272e42] text-slate-300'
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-sky-400 group-hover:text-sky-300">
            &#123;&#123;{variable.key}&#125;&#125;
          </span>
          <VariableSourceBadge source={variable.source} isSecret={variable.isSecret} short />
        </div>

        {variable.description && (
          <p className="text-[11px] text-slate-400 truncate">{variable.description}</p>
        )}

        {/* Value preview: Never display plaintext secret */}
        <div className="text-[10px] font-mono text-slate-500 truncate">
          {variable.isSecret ? (
            <span className="text-amber-400/80 flex items-center gap-1">
              <Lock size={9} />
              <span>•••••••• (Secret)</span>
            </span>
          ) : (
            <span className="text-slate-400">Value: {variable.value || '(empty)'}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-0.5">
        <span
          className={cn(
            'text-[10px] font-mono px-2 py-0.5 rounded border transition-colors',
            isSelected
              ? 'bg-sky-600 text-white border-sky-500'
              : 'bg-[#1b202d] text-slate-400 border-[#2b3348] group-hover:border-slate-500'
          )}
        >
          Insert
        </span>
      </div>
    </button>
  );
}

