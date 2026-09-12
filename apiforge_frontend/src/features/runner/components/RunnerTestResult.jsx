import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, XCircle, Info, ExternalLink } from 'lucide-react';
import { cn } from '../../../utils/cn';
import RunnerAssertionResult from './RunnerAssertionResult';

export default function RunnerTestResult({ tests, execution, onOpenRequest, className }) {
  if (!tests) return null;

  const { total = 0, passed = 0, failed = 0, executed = true, results = [] } = tests;

  return (
    <div className={cn('p-3 rounded-md bg-[#131620] border border-[#232732] space-y-3', className)}>
      {/* Test Section Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1f2433] pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-sky-400" />
          <span className="text-xs font-semibold text-slate-200">
            Tests &amp; Assertions
          </span>
          {executed && total > 0 && (
            <span
              className={cn(
                'text-[10px] font-mono px-1.5 py-0.2 rounded font-medium border',
                failed === 0
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                  : passed === 0
                  ? 'text-rose-400 bg-rose-950/40 border-rose-800/40'
                  : 'text-amber-400 bg-amber-950/40 border-amber-800/40'
              )}
            >
              {passed} / {total} passed
            </span>
          )}
        </div>

        {executed && total > 0 && (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            {failed === 0 ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>All assertions passed</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <XCircle size={12} />
                <span>{failed} {failed === 1 ? 'assertion' : 'assertions'} failed</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Case 1: Tests not executed due to request failure */}
      {!executed && (
        <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-slate-400 text-xs flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-medium text-slate-300">Tests were not executed</span>
            <p className="text-[11px] text-slate-400">
              {execution?.error ||
                'The HTTP request failed before a response could be received (e.g. network error, connection timeout, or invalid URL).'}
            </p>
          </div>
        </div>
      )}

      {/* Case 2: Executed, but no tests defined */}
      {executed && total === 0 && (
        <div className="py-2 px-2.5 rounded bg-[#10131d] border border-[#1e2333] text-slate-500 text-xs flex items-center gap-2">
          <Info size={13} className="text-slate-500 shrink-0" />
          <span className="italic text-[11px]">No tests or assertions configured for this request.</span>
        </div>
      )}

      {/* Case 3: Executed with test results */}
      {executed && results.length > 0 && (
        <div className="space-y-3">
          {results.map((test, idx) => {
            const isTestPassed = test.passed;
            return (
              <div
                key={test.id || idx}
                className="p-2.5 rounded bg-[#0f1118] border border-[#1e2230] space-y-2"
              >
                {/* Test Suite / Group Header */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        isTestPassed ? 'bg-emerald-400' : 'bg-rose-400'
                      )}
                    />
                    <span className="font-medium text-slate-200 truncate">
                      {test.name || 'Unnamed Test'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isTestPassed && onOpenRequest && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRequest();
                        }}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e2330] hover:bg-[#282f42] text-slate-300 hover:text-white border border-[#2b3140] text-[10px] font-mono transition-colors cursor-pointer"
                        title="Open Request in editor to inspect test"
                      >
                        <ExternalLink size={10} />
                        <span>Open Request</span>
                      </button>
                    )}
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider',
                        isTestPassed
                          ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                          : 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
                      )}
                    >
                      {isTestPassed ? 'PASS' : 'FAIL'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 bg-[#161a25] px-1.5 py-0.2 rounded border border-[#232732]">
                      {test.passedCount}/{test.total}
                    </span>
                  </div>
                </div>

                {/* Assertions List */}
                {Array.isArray(test.assertions) && test.assertions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {test.assertions.map((assertion, aIdx) => (
                      <RunnerAssertionResult
                        key={assertion.assertionId || aIdx}
                        assertion={assertion}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
