import { useState, useEffect } from 'react';
import { Play, Loader2, AlertTriangle, ShieldX, CheckCircle2 } from 'lucide-react';
import ResponseStatus from './ResponseStatus';
import ResponseMeta from './ResponseMeta';
import ResponseTabs from './ResponseTabs';
import ResponseBody from './ResponseBody';
import ResponseHeaders from './ResponseHeaders';
import ResponseCookies from './ResponseCookies';
import ResponseRaw from './ResponseRaw';
import useResponseStore from '../store/responseStore';
import { cn } from '../../../utils/cn';

export default function ResponseInspector({ className }) {
  const {
    status,
    response,
    error,
    activeTab,
    bodyMode,
    searchQuery,
    setActiveTab,
    setBodyMode,
    setSearchQuery,
  } = useResponseStore();

  const [matchCount, setMatchCount] = useState(0);
  const [elapsedTimer, setElapsedTimer] = useState(0);

  // Live timer during loading state
  useEffect(() => {
    if (status !== 'loading') return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTimer(Date.now() - startTime);
    }, 50);
    return () => {
      clearInterval(interval);
    };
  }, [status]);

  return (
    <div
      className={cn(
        'flex-1 flex flex-col h-full bg-[#0d0f14] border-t md:border-t-0 md:border-l border-[#232732] min-w-0 overflow-hidden',
        className
      )}
    >
      {/* Top Status & Meta Header (only visible when response exists) */}
      {status === 'success' && response && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#111318] border-b border-[#232732] gap-3">
          <div className="flex items-center gap-3">
            <ResponseStatus status={response.status} statusText={response.statusText} />
            <ResponseMeta
              timeMs={response.timeMs}
              sizeBytes={response.sizeBytes}
              contentType={response.contentType}
            />
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-500 truncate max-w-xs">
            <span className="truncate">{response.url}</span>
          </div>
        </div>
      )}

      {/* IDLE STATE */}
      {status === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[radial-gradient(#1a1d26_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="w-12 h-12 rounded-lg bg-[#14171f] border border-[#232732] flex items-center justify-center text-sky-400 mb-3 shadow-xl">
            <Play size={20} className="translate-x-0.5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            Ready to Execute
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Click <span className="text-sky-400 font-medium">Send</span> or press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-[#181b22] border border-[#2b313e] font-mono text-[11px] text-slate-300">
              Ctrl+Enter
            </kbd>{' '}
            to send this request via the APIForge execution engine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#14171f] border border-[#232732]">
              <CheckCircle2 size={11} className="text-emerald-400" /> SSRF Protected
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#14171f] border border-[#232732]">
              <CheckCircle2 size={11} className="text-emerald-400" /> Variable Engine
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#14171f] border border-[#232732]">
              <CheckCircle2 size={11} className="text-emerald-400" /> 10MB Guard
            </span>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {status === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[#090a0f]">
          <div className="relative mb-3">
            <Loader2 size={32} className="text-sky-500 animate-spin" />
            <div className="absolute inset-0 rounded-full blur-md bg-sky-500/20" />
          </div>
          <div className="text-xs font-semibold text-slate-200 font-mono mb-1">
            Executing Request...
          </div>
          <div className="text-xs font-mono text-sky-400 mb-3">
            {(elapsedTimer / 1000).toFixed(2)}s elapsed
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Resolving variables, performing SSRF security checks, and connecting to host...
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <div className="flex-1 flex flex-col p-6 overflow-auto">
          <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/60 text-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
              {error?.status === 403 ? (
                <ShieldX size={16} className="text-rose-400" />
              ) : (
                <AlertTriangle size={16} className="text-rose-400" />
              )}
              <span>Execution Failed {error?.status ? `(${error.status})` : ''}</span>
            </div>

            <p className="text-xs font-mono font-medium text-rose-200 break-words leading-relaxed">
              {error?.message || 'An unexpected error occurred during request execution.'}
            </p>

            {error?.details && (
              <pre className="p-3 bg-[#0d0f14] border border-rose-900/40 rounded text-[11px] font-mono text-rose-300 overflow-x-auto">
                {typeof error.details === 'object'
                  ? JSON.stringify(error.details, null, 2)
                  : String(error.details)}
              </pre>
            )}

            <div className="pt-2 border-t border-rose-900/40 text-[11px] text-rose-300/80">
              <span className="font-semibold text-rose-200">Suggestions:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Check that all <code className="text-rose-200">{"{{variables}}"}</code> in the URL and headers are defined in your active environment.</li>
                <li>Ensure the target server is reachable and accepting connections.</li>
                <li>Verify that the URL protocol is <code className="text-rose-200">http://</code> or <code className="text-rose-200">https://</code>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS STATE WITH TABS & CONTENT */}
      {status === 'success' && response && (
        <>
          <ResponseTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            headersCount={Object.keys(response.headers || {}).length}
            bodyMode={bodyMode}
            onBodyModeChange={setBodyMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
            matchCount={matchCount}
          />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'body' && (
              <ResponseBody
                body={response.body}
                contentType={response.contentType}
                mode={bodyMode}
                searchQuery={searchQuery}
                onMatchCountChange={setMatchCount}
              />
            )}

            {activeTab === 'headers' && (
              <ResponseHeaders headers={response.headers} />
            )}

            {activeTab === 'cookies' && (
              <ResponseCookies headers={response.headers} />
            )}

            {activeTab === 'raw' && (
              <ResponseRaw response={response} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

