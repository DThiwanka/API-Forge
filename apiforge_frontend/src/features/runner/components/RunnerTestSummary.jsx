import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RunnerTestSummary({
  tests,
  skipped = false,
  showEmpty = false,
  className,
}) {
  if (skipped) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-900/60 border border-slate-800',
          className
        )}
      >
        <MinusCircle size={10} />
        <span>Tests skipped</span>
      </span>
    );
  }

  if (!tests) return null;

  if (tests.executed === false) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800',
          className
        )}
      >
        <MinusCircle size={10} />
        <span>Tests not run</span>
      </span>
    );
  }

  const { total = 0, passed = 0, failed = 0 } = tests;

  if (total === 0) {
    if (!showEmpty) return null;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-[#12151d] border border-[#202534]',
          className
        )}
      >
        <span>No tests</span>
      </span>
    );
  }

  // All Passed
  if (failed === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/50',
          className
        )}
        title={`${passed} of ${total} assertions passed`}
      >
        <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
        <span>{total === 1 ? '1 test passed' : `${passed}/${total} passed`}</span>
      </span>
    );
  }

  // All Failed
  if (passed === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-rose-400 bg-rose-950/50 border border-rose-800/50',
          className
        )}
        title={`${failed} of ${total} assertions failed`}
      >
        <XCircle size={10} className="text-rose-400 shrink-0" />
        <span>{total === 1 ? '1 test failed' : `${failed}/${total} failed`}</span>
      </span>
    );
  }

  // Mixed Passed and Failed
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-amber-400 bg-amber-950/50 border border-amber-800/50',
        className
      )}
      title={`${passed} passed, ${failed} failed out of ${total} assertions`}
    >
      <AlertTriangle size={10} className="text-amber-400 shrink-0" />
      <span>{passed} passed · {failed} failed</span>
    </span>
  );
}

