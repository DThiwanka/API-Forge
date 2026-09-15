import { memo, useState } from 'react';
import { Network, X, ChevronUp, ChevronDown, KeyRound, Variable, Link2 } from 'lucide-react';

export function CanvasLegend({ isOpen = true, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-4 left-4 z-20 select-none animate-in fade-in duration-200">
      <div className="rounded-xl bg-[#111318]/95 border border-[#232732] shadow-xl backdrop-blur-md overflow-hidden text-xs w-64">
        {/* Header */}
        <div className="px-3 py-2 border-b border-[#212634] flex items-center justify-between bg-[#151824]/90">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <Network size={13} className="text-sky-400" />
            <span className="text-[11px] font-semibold">Relationship Legend</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f242e] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand legend' : 'Collapse legend'}
            >
              {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#1f242e] transition-colors cursor-pointer"
                title="Close legend"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Legend Body */}
        {!isCollapsed && (
          <div className="p-3 space-y-2.5">
            {/* Explicit */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 bg-sky-400 rounded-full" />
                <span className="text-slate-300 font-medium">Explicit Connection</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Manual</span>
            </div>

            {/* Auth */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-0.5 rounded-full"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to right, #f59e0b 0, #f59e0b 4px, transparent 4px, transparent 8px)',
                  }}
                />
                <div className="flex items-center gap-1 text-slate-300">
                  <KeyRound size={11} className="text-amber-400" />
                  <span>Auth Dependency</span>
                </div>
              </div>
              <span className="text-[10px] text-amber-400/90 font-mono">Inferred</span>
            </div>

            {/* Variable */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-0.5 rounded-full"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to right, #818cf8 0, #818cf8 4px, transparent 4px, transparent 8px)',
                  }}
                />
                <div className="flex items-center gap-1 text-slate-300">
                  <Variable size={11} className="text-indigo-400" />
                  <span>Variable Reference</span>
                </div>
              </div>
              <span className="text-[10px] text-indigo-400/90 font-mono">Inferred</span>
            </div>

            {/* Resource */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-0.5 rounded-full"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to right, #10b981 0, #10b981 4px, transparent 4px, transparent 8px)',
                  }}
                />
                <div className="flex items-center gap-1 text-slate-300">
                  <Link2 size={11} className="text-emerald-400" />
                  <span>Shared Resource</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400/90 font-mono">Inferred</span>
            </div>

            <div className="pt-1.5 border-t border-[#212634] text-[10px] text-slate-400 leading-snug">
              Click any edge badge to inspect dependency details or promote to a permanent connection.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CanvasLegend);
