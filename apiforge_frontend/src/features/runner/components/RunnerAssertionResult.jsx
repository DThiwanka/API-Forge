import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import {
  ASSERTION_TYPES,
  OPERATOR_LABELS,
  requiresExpectedValue,
} from '../../testing/constants/assertionTypes';

export default function RunnerAssertionResult({ assertion, className }) {
  if (!assertion) return null;

  const {
    type,
    path,
    operator,
    passed = false,
    actualValue,
    expectedValue,
    message,
  } = assertion;

  const opLabel = OPERATOR_LABELS[operator] || operator;

  const formatValue = (val) => {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return val;
    return JSON.stringify(val);
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 px-3 py-2 rounded border text-xs transition-colors',
        passed
          ? 'bg-emerald-950/15 border-emerald-800/30 text-emerald-300'
          : 'bg-rose-950/20 border-rose-800/40 text-rose-300',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Pass/Fail Status Icon */}
          {passed ? (
            <span
              className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"
              title="Passed"
            >
              <Check size={11} strokeWidth={3} />
            </span>
          ) : (
            <span
              className="flex-shrink-0 w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center"
              title="Failed"
            >
              <X size={11} strokeWidth={3} />
            </span>
          )}

          {/* Type Pill */}
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-[#1b1f2a] border border-[#282f40] text-slate-400 flex-shrink-0">
            {type ? type.replace('_', ' ') : 'ASSERTION'}
          </span>

          {/* Target Path / Expression & Expected Value */}
          <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
            {path && (
              <span className="text-sky-300 font-medium truncate" title={path}>
                {path}
              </span>
            )}
            <span className="text-slate-400">{opLabel}</span>
            {requiresExpectedValue(operator) && (
              <span
                className="text-amber-300 font-semibold truncate"
                title={formatValue(expectedValue)}
              >
                {formatValue(expectedValue)}
                {type === ASSERTION_TYPES.RESPONSE_TIME ? 'ms' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Pass/Fail status text pill */}
        <span
          className={cn(
            'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold shrink-0 uppercase tracking-wider',
            passed
              ? 'text-emerald-400 bg-emerald-950/40'
              : 'text-rose-400 bg-rose-950/40'
          )}
        >
          {passed ? 'PASS' : 'FAIL'}
        </span>
      </div>

      {/* Failure Diagnostic Details */}
      {!passed && (
        <div className="pl-6 pt-0.5 text-[11px] font-mono text-rose-300/90 flex flex-col gap-1 border-t border-rose-900/30 mt-0.5">
          {message && (
            <span className="break-all text-rose-300">
              {message}
            </span>
          )}
          {actualValue !== undefined && (
            <div className="text-slate-400 flex items-center gap-1.5">
              <span>Actual:</span>
              <span className="text-rose-300 font-semibold font-mono bg-rose-950/30 px-1 py-0.2 rounded border border-rose-900/40 break-all">
                {formatValue(actualValue)}
                {type === ASSERTION_TYPES.RESPONSE_TIME ? 'ms' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

