import { useState, useRef } from 'react';
import { Variable, AlertTriangle, Lock, Globe, Cpu, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function VariableToken({
  name,
  isKnown = true,
  source = 'environment',
  isSecret = false,
  previewValue,
  description,
  envName,
  interactive = true,
  onClick,
  className,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tokenRef = useRef(null);

  // Strip curly braces if passed with them
  const cleanName = String(name || '').replace(/[{}]/g, '').trim();

  // Source styling
  const sourceBorder =
    !isKnown
      ? 'border-amber-600/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
      : source === 'runtime'
      ? 'border-purple-600/40 bg-purple-950/30 text-purple-300 hover:bg-purple-950/50'
      : source === 'extracted'
      ? 'border-emerald-600/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/50'
      : 'border-sky-600/40 bg-sky-950/30 text-sky-300 hover:bg-sky-950/50';

  const SourceIcon =
    source === 'runtime'
      ? Cpu
      : source === 'extracted'
      ? ArrowRightLeft
      : Globe;

  return (
    <span
      ref={tokenRef}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors select-none',
        sourceBorder,
        interactive && 'cursor-pointer',
        className
      )}
    >
      {/* Icon */}
      {!isKnown ? (
        <AlertTriangle size={11} className="text-amber-400 shrink-0" />
      ) : (
        <Variable size={11} className="shrink-0 opacity-70" />
      )}

      {/* Name */}
      <span className="font-semibold">&#123;&#123;{cleanName}&#125;&#125;</span>

      {/* Warning badge if undefined */}
      {!isKnown && (
        <span className="text-[9px] uppercase tracking-wider font-sans px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
          undefined
        </span>
      )}

      {/* Secret lock icon */}
      {isKnown && isSecret && (
        <Lock size={10} className="text-amber-400 shrink-0" title="Secret variable" />
      )}

      {/* Tooltip Card */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-56 p-2.5 rounded-md bg-[#131620] border border-[#2e3547] shadow-xl text-left font-sans text-xs space-y-1.5 pointer-events-none">
          <div className="flex items-center justify-between border-b border-[#232732] pb-1.5">
            <span className="font-mono text-xs font-semibold text-slate-100 flex items-center gap-1 truncate">
              <Variable size={12} className="text-sky-400 shrink-0" />
              <span>{cleanName}</span>
            </span>

            {isKnown ? (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1c202b] border border-[#2b3140] text-slate-300 flex items-center gap-1">
                <SourceIcon size={9} />
                <span className="capitalize">{source}</span>
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-700/50 text-amber-300">
                Undefined
              </span>
            )}
          </div>

          {isKnown ? (
            <div className="space-y-1 text-[11px] text-slate-400">
              {source === 'environment' && envName && (
                <div className="flex items-center justify-between">
                  <span>Environment:</span>
                  <span className="font-mono text-slate-200">{envName}</span>
                </div>
              )}
              {isSecret ? (
                <div className="flex items-center justify-between text-amber-300/90 font-mono">
                  <span>Secret:</span>
                  <span className="flex items-center gap-1">
                    <Lock size={10} /> Value masked
                  </span>
                </div>
              ) : previewValue !== undefined && previewValue !== null && (
                <div className="flex items-start justify-between gap-1">
                  <span className="shrink-0 text-slate-500">Value:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[130px]" title={String(previewValue)}>
                    {String(previewValue) || '(empty)'}
                  </span>
                </div>
              )}
              {description && (
                <div className="text-slate-500 text-[10px] italic border-t border-[#1f2431] pt-1">
                  {description}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-amber-300/90 leading-tight">
              Variable is referenced in the request but not defined in the active environment, runner runtime, or extractions.
            </div>
          )}
        </div>
      )}
    </span>
  );
}
