import React from 'react';
import { Sparkles, Layers, ShieldCheck, AlertTriangle, Variable, Play } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RunnerConfigSummary({
  collectionName,
  selectedRequestCount = 0,
  totalRequestCount = 0,
  selectedFolderCount = 0,
  environmentName,
  runtimeVariableCount = 0,
  stopOnError = false,
  executeTests = true,
  onRun,
  canRun = true,
  isRunning = false,
  className,
}) {
  const isSelectionEmpty = selectedRequestCount === 0;

  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-[#11131a] border border-[#232732] space-y-3.5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#1e222d] pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-amber-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Ready to Run
          </h3>
        </div>
        <span
          className={cn(
            'text-[10px] font-mono px-2 py-0.5 rounded font-medium border',
            isSelectionEmpty
              ? 'text-rose-400 bg-rose-950/30 border-rose-800/30'
              : 'text-emerald-400 bg-emerald-950/30 border-emerald-800/30'
          )}
        >
          {isSelectionEmpty ? 'No requests selected' : 'Configuration Valid'}
        </span>
      </div>

      {/* Grid of 4 configuration metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        {/* Collection */}
        <div className="p-2.5 rounded bg-[#151822] border border-[#232732]">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Layers size={11} className="text-sky-400" />
            <span>Collection</span>
          </div>
          <div
            className="font-semibold text-slate-200 truncate text-xs"
            title={collectionName || 'None'}
          >
            {collectionName || 'None'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Sequential Mode
          </div>
        </div>

        {/* Requests */}
        <div className="p-2.5 rounded bg-[#151822] border border-[#232732]">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Play size={11} className="text-emerald-400" />
            <span>Requests</span>
          </div>
          <div className="font-semibold font-mono text-emerald-400 text-xs">
            {selectedRequestCount} of {totalRequestCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {selectedFolderCount} {selectedFolderCount === 1 ? 'folder' : 'folders'}
          </div>
        </div>

        {/* Environment & Variables */}
        <div className="p-2.5 rounded bg-[#151822] border border-[#232732]">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <Variable size={11} className="text-purple-400" />
            <span>Environment</span>
          </div>
          <div
            className="font-semibold text-slate-200 truncate text-xs"
            title={environmentName || 'No Environment'}
          >
            {environmentName || 'No Environment'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {runtimeVariableCount}{' '}
            {runtimeVariableCount === 1 ? 'runtime var' : 'runtime vars'}
          </div>
        </div>

        {/* Policies (Stop on Error & Tests) */}
        <div className="p-2.5 rounded bg-[#151822] border border-[#232732]">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <ShieldCheck size={11} className="text-teal-400" />
            <span>Execution</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
            <span>Stop on Error:</span>
            <span
              className={cn(
                'font-semibold',
                stopOnError ? 'text-amber-400' : 'text-slate-400'
              )}
            >
              {stopOnError ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5">
            <span>Tests:</span>
            <span
              className={cn(
                'font-semibold',
                executeTests ? 'text-emerald-400' : 'text-slate-500'
              )}
            >
              {executeTests ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Empty Selection Warning */}
      {isSelectionEmpty && (
        <div className="p-2 rounded bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={13} className="text-rose-400 shrink-0" />
          <span>Select at least one request from the selection tree on the left to execute.</span>
        </div>
      )}

      {/* Primary Action bar inside config summary */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[11px] text-slate-500 italic">
          Press <kbd className="px-1.5 py-0.5 rounded bg-[#1b1f2a] border border-[#2c3242] text-slate-300 text-[10px] font-mono">Ctrl+Enter</kbd> to execute
        </span>

        {onRun && (
          <button
            type="button"
            onClick={onRun}
            disabled={!canRun || isRunning || isSelectionEmpty}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-sm"
          >
            <Play size={12} className="fill-current" />
            <span>Start Execution</span>
          </button>
        )}
      </div>
    </div>
  );
}

