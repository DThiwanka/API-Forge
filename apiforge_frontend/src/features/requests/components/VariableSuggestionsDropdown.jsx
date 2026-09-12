import { useEffect, useRef } from 'react';
import { Variable, Lock } from 'lucide-react';
import VariableSourceBadge from '../../environments/components/VariableSourceBadge';
import { cn } from '../../../utils/cn';

export default function VariableSuggestionsDropdown({
  isOpen,
  suggestions = [],
  selectedIndex = 0,
  onSelect,
  className,
}) {
  const dropdownRef = useRef(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeEl = dropdownRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, selectedIndex]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute z-50 mt-1 max-h-56 w-72 overflow-y-auto rounded-lg bg-[#12151f] border border-[#272f42] shadow-2xl p-1 font-sans text-xs divide-y divide-[#1c2230]',
        className
      )}
    >
      {suggestions.map((v, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={v.key}
            type="button"
            onMouseDown={(e) => {
              // Use onMouseDown instead of onClick so input doesn't lose focus before select
              e.preventDefault();
              onSelect(v.key);
            }}
            className={cn(
              'w-full text-left px-2.5 py-1.5 rounded transition-colors flex items-center justify-between gap-2 cursor-pointer',
              isSelected
                ? 'bg-sky-950/60 text-sky-200 border-l-2 border-sky-500'
                : 'text-slate-300 hover:bg-[#181d2a]'
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Variable size={12} className={isSelected ? 'text-sky-400' : 'text-slate-500'} />
              <span className="font-mono text-xs font-semibold truncate">
                &#123;&#123;{v.key}&#125;&#125;
              </span>
              {v.isSecret && <Lock size={10} className="text-amber-400 shrink-0" title="Secret" />}
            </div>

            <div className="shrink-0">
              <VariableSourceBadge source={v.source} isSecret={false} showLabel={false} short />
            </div>
          </button>
        );
      })}
    </div>
  );
}
