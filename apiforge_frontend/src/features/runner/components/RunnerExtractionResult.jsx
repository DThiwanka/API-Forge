import { Check, X, Variable, ShieldCheck } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RunnerExtractionResult({ extraction, className }) {
  if (!extraction) return null;

  const { success, variables = [], error } = extraction;

  return (
    <div
      className={cn(
        'p-3 rounded-md border text-xs space-y-2',
        success
          ? 'bg-[#101918] border-emerald-900/40'
          : 'bg-[#1a1114] border-rose-900/40',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-medium">
          <Variable
            size={13}
            className={success ? 'text-emerald-400' : 'text-rose-400'}
          />
          <span className={success ? 'text-emerald-300' : 'text-rose-300'}>
            {success ? 'Variable Extraction Succeeded' : 'Variable Extraction Failed'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <ShieldCheck size={11} className="text-slate-400" />
          <span>Values protected in runtime memory</span>
        </div>
      </div>

      {success ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {variables.length === 0 ? (
              <span className="text-slate-500 italic text-[11px]">No variables defined</span>
            ) : (
              variables.map((varName) => (
                <span
                  key={varName}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 font-mono text-[11px]"
                >
                  <Check size={11} className="text-emerald-400 shrink-0" />
                  <span>{varName}</span>
                </span>
              ))
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Available to downstream requests via <code className="text-sky-300 font-mono">&#123;&#123;variableName&#125;&#125;</code> syntax.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-start gap-1.5 text-rose-300 font-mono text-[11px]">
            <X size={13} className="text-rose-400 shrink-0 mt-0.5" />
            <span className="break-all">{error || 'Unknown extraction error occurred'}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Verify the target JSON path or header exists in the response.
          </p>
        </div>
      )}
    </div>
  );
}

