import React from 'react';
import { Check, X, Circle, Pencil, Trash2 } from 'lucide-react';
import {
  ASSERTION_TYPES,
  OPERATOR_LABELS,
  requiresExpectedValue,
} from '../constants/assertionTypes';

export default function AssertionRow({
  assertion,
  result,
  onEdit,
  onDelete,
  readOnly = false,
}) {
  const { type, path, operator, expectedValue } = assertion;
  const opLabel = OPERATOR_LABELS[operator] || operator;

  const passed = result?.passed;
  const hasRun = result !== undefined && result !== null;

  return (
    <div
      className={`group flex flex-col gap-1.5 px-3 py-2 rounded-md border text-xs transition-colors ${
        hasRun
          ? passed
            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
            : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
          : 'bg-[#14171f] border-[#232732] text-slate-300 hover:border-[#2f3545]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Status icon */}
          {hasRun ? (
            passed ? (
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check size={11} strokeWidth={3} />
              </span>
            ) : (
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <X size={11} strokeWidth={3} />
              </span>
            )
          ) : (
            <Circle size={10} className="text-slate-500 flex-shrink-0" />
          )}

          {/* Type pill */}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#1c202a] border border-[#2b313e] text-slate-400 flex-shrink-0">
            {type.replace('_', ' ')}
          </span>

          {/* Description */}
          <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
            {path && (
              <span className="text-sky-300 font-medium truncate" title={path}>
                {path}
              </span>
            )}
            <span className="text-slate-400">{opLabel}</span>
            {requiresExpectedValue(operator) && (
              <span className="text-amber-300 font-semibold truncate" title={expectedValue}>
                {expectedValue}
                {type === ASSERTION_TYPES.RESPONSE_TIME ? 'ms' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(assertion)}
                className="p-1 text-slate-400 hover:text-sky-300 rounded hover:bg-[#202531] transition-colors"
                title="Edit Assertion"
                aria-label="Edit Assertion"
              >
                <Pencil size={12} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(assertion)}
                className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-[#202531] transition-colors"
                title="Delete Assertion"
                aria-label="Delete Assertion"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Failure Diagnostic details */}
      {hasRun && !passed && (
        <div className="pl-6 text-[11px] font-mono text-rose-400/90 flex flex-col gap-0.5">
          {result?.message && <span>{result.message}</span>}
          {result?.actualValue !== undefined && (
            <span className="text-slate-400">
              Actual:{' '}
              <span className="text-rose-300 font-semibold">
                {result.actualValue === null ? 'null' : JSON.stringify(result.actualValue)}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

