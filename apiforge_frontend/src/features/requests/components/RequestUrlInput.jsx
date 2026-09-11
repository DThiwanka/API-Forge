import { useMemo } from 'react';
import { Variable } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestUrlInput({ value = '', onChange, onKeyDown, className, placeholder }) {
  // Extract all {{variable}} tokens from the URL for visual tags
  const detectedVariables = useMemo(() => {
    if (!value) return [];
    const matches = value.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
    if (!matches) return [];
    // Deduplicate
    return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim())));
  }, [value]);

  return (
    <div className={cn('relative flex-1 flex flex-col', className)}>
      <div className="relative flex-1 flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || 'Enter URL or {{baseUrl}}/endpoint'}
          spellCheck={false}
          autoComplete="off"
          className="w-full h-full py-2 px-3 bg-[#111318] text-slate-100 placeholder-slate-500 font-mono text-xs border-y border-[#2b313e] focus:outline-none focus:border-sky-500 transition-colors"
        />

        {detectedVariables.length > 0 && (
          <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
            {detectedVariables.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-300 select-none shadow-sm"
              >
                <Variable size={10} className="text-amber-400" />
                <span>{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

