import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';

const METHODS = [
  { method: 'GET', color: 'text-emerald-400', badge: 'bg-emerald-950/40 border-emerald-800/50' },
  { method: 'POST', color: 'text-amber-400', badge: 'bg-amber-950/40 border-amber-800/50' },
  { method: 'PUT', color: 'text-blue-400', badge: 'bg-blue-950/40 border-blue-800/50' },
  { method: 'PATCH', color: 'text-purple-400', badge: 'bg-purple-950/40 border-purple-800/50' },
  { method: 'DELETE', color: 'text-rose-400', badge: 'bg-rose-950/40 border-rose-800/50' },
  { method: 'HEAD', color: 'text-teal-400', badge: 'bg-teal-950/40 border-teal-800/50' },
  { method: 'OPTIONS', color: 'text-indigo-400', badge: 'bg-indigo-950/40 border-indigo-800/50' },
];

export default function RequestMethodSelector({ value = 'GET', onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const currentMethod = METHODS.find((m) => m.method === value?.toUpperCase()) || METHODS[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-l-md font-mono font-bold text-xs border border-r-0 border-[#2b313e] bg-[#14171f] hover:bg-[#1c212c] transition-colors focus:outline-none select-none',
          currentMethod.color
        )}
      >
        <span>{currentMethod.method}</span>
        <ChevronDown size={13} className="opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 font-mono text-xs font-semibold">
          {METHODS.map((m) => (
            <button
              key={m.method}
              type="button"
              onClick={() => {
                onChange?.(m.method);
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 hover:bg-[#232732] transition-colors flex items-center justify-between',
                m.color,
                value === m.method && 'bg-[#1e2330]'
              )}
            >
              <span>{m.method}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

