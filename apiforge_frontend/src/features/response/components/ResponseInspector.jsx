import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Loader2,
  AlertTriangle,
  ShieldX,
  CheckCircle2,
  Copy,
  Plus,
} from 'lucide-react';
import ResponseStatus from './ResponseStatus';
import ResponseMeta from './ResponseMeta';
import ResponseTabs from './ResponseTabs';
import ResponseBody from './ResponseBody';
import ResponseHeaders from './ResponseHeaders';
import ResponseCookies from './ResponseCookies';
import ResponseRaw from './ResponseRaw';
import CreateTestFromResponseDialog from './CreateTestFromResponseDialog';
import CreateExtractionDialog from './CreateExtractionDialog';
import CreateRequestDialog from '../../collections/components/CreateRequestDialog';
import useResponseStore from '../store/responseStore';
import { parseBodyContent } from '../utils/responseFormatters';
import {
  buildStatusAssertion,
  buildResponseTimeAssertion,
  buildJsonPathAssertion,
} from '../utils/responseActionHelpers';
import { useToastStore } from '../../../stores/toastStore';
import { cn } from '../../../utils/cn';

export default function ResponseInspector({
  workspaceId,
  collectionId,
  requestId,
  className,
}) {
  const activeRequestId = useResponseStore((s) => s.activeRequestId);
  const currentRequestId = requestId || activeRequestId;

  // Subscribe to response state
  const responseState = useResponseStore(
    useCallback((s) => s.getResponseState(currentRequestId), [currentRequestId])
  );

  const {
    status = 'idle',
    response = null,
    error = null,
    activeTab = 'body',
    bodyMode = 'pretty',
    searchQuery = '',
  } = responseState;

  const setActiveTab = useCallback(
    (tab) => useResponseStore.getState().setActiveTab(tab, currentRequestId),
    [currentRequestId]
  );

  const setBodyMode = useCallback(
    (mode) => useResponseStore.getState().setBodyMode(mode, currentRequestId),
    [currentRequestId]
  );

  const setSearchQuery = useCallback(
    (query) => useResponseStore.getState().setSearchQuery(query, currentRequestId),
    [currentRequestId]
  );

  // Search match navigation
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef(null);

  // Response debugging dialog states
  const [testDialogState, setTestDialogState] = useState({
    isOpen: false,
    assertion: null,
    testName: '',
  });

  const [extractionDialogState, setExtractionDialogState] = useState({
    isOpen: false,
    path: '',
    source: 'json',
    value: undefined,
  });

  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);

  // Live timer during loading state
  const [elapsedTimer, setElapsedTimer] = useState(0);
  useEffect(() => {
    if (status !== 'loading') return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTimer(Date.now() - startTime);
    }, 50);
    return () => clearInterval(interval);
  }, [status]);

  const handleSearchChange = useCallback(
    (query) => {
      setSearchQuery(query);
      setCurrentMatchIndex(0);
    },
    [setSearchQuery]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setCurrentMatchIndex(0);
  }, [setSearchQuery]);

  const handleNextMatch = () => {
    if (matchCount <= 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
  };

  const handlePrevMatch = () => {
    if (matchCount <= 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
  };

  // Keyboard shortcut: Ctrl/Cmd + F to focus search input in response inspector
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (activeTab === 'body' && status === 'success') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, status]);

  // Determine if body is JSON
  const isJson = useMemo(() => {
    if (!response?.body) return false;
    return parseBodyContent(response.body).isJson;
  }, [response]);

  // Count cookies from set-cookie headers
  const cookiesCount = useMemo(() => {
    if (!response?.headers) return 0;
    const setCookie = Object.entries(response.headers).find(
      ([k]) => k.toLowerCase() === 'set-cookie'
    );
    if (!setCookie) return 0;
    return Array.isArray(setCookie[1]) ? setCookie[1].length : 1;
  }, [response]);

  // Handlers for debugging shortcuts
  const handleOpenStatusTest = (stat) => {
    const assertion = buildStatusAssertion(stat);
    setTestDialogState({
      isOpen: true,
      assertion,
      testName: `Verify Status ${stat}`,
    });
  };

  const handleOpenTimeTest = (time) => {
    const assertion = buildResponseTimeAssertion(time);
    setTestDialogState({
      isOpen: true,
      assertion,
      testName: 'Verify Response Time',
    });
  };

  const handleOpenAssertionBuilder = (assertionPayload, testName = '') => {
    setTestDialogState({
      isOpen: true,
      assertion: assertionPayload,
      testName,
    });
  };

  const handleOpenCreateTestFromNode = (path, value) => {
    const assertion = buildJsonPathAssertion(path, value);
    setTestDialogState({
      isOpen: true,
      assertion,
      testName: `Verify ${path}`,
    });
  };

  const handleOpenCreateExtraction = (path, value) => {
    setExtractionDialogState({
      isOpen: true,
      path,
      source: 'json',
      value,
    });
  };

  const handleCopyUrl = () => {
    if (!response?.url) return;
    navigator.clipboard.writeText(response.url);
    useToastStore.getState().toast.success('Response URL copied');
  };

  return (
    <div
      className={cn(
        'flex-1 flex flex-col h-full bg-[#0d0f14] border-t md:border-t-0 md:border-l border-[#232732] min-w-0 overflow-hidden',
        className
      )}
    >
      {/* Top Status & Meta Header (visible when response exists) */}
      {status === 'success' && response && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#111318] border-b border-[#232732] gap-3 select-none">
          <div className="flex items-center gap-3">
            <ResponseStatus
              status={response.status}
              statusText={response.statusText}
              onCreateTest={handleOpenStatusTest}
            />
            <ResponseMeta
              timeMs={response.timeMs}
              sizeBytes={response.sizeBytes}
              contentType={response.contentType}
              onCreateTimeTest={handleOpenTimeTest}
            />
          </div>

          <div className="flex items-center gap-2">
            {response.url && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsCreateRequestOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 font-sans transition-colors cursor-pointer"
                  title="Open final response URL as a new request"
                >
                  <Plus size={11} className="text-sky-400" />
                  <span>Open as Request</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-[11px] text-slate-300 font-mono transition-colors cursor-pointer"
                  title={`Copy URL: ${response.url}`}
                >
                  <Copy size={11} className="text-slate-400" />
                  <span className="hidden md:inline">Copy URL</span>
                </button>
              </div>
            )}
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

      {/* EXECUTION FAILURE ERROR STATE */}
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
              <span className="font-semibold text-rose-200">Troubleshooting Suggestions:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Check that all <code className="text-rose-200">{"{{variables}}"}</code> in the URL and headers are defined in your active environment.</li>
                <li>Ensure the target server is reachable and accepting network connections.</li>
                <li>Verify that the URL protocol is <code className="text-rose-200">http://</code> or <code className="text-rose-200">https://</code>.</li>
                <li>Ensure the destination host is not on a private/restricted subnet blocked by SSRF policies.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS STATE WITH TABS & CONTENT (valid HTTP response, 2xx, 3xx, 4xx, 5xx) */}
      {status === 'success' && response && (
        <>
          <ResponseTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            headersCount={Object.keys(response.headers || {}).length}
            cookiesCount={cookiesCount}
            bodyMode={bodyMode}
            onBodyModeChange={setBodyMode}
            isJson={isJson}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            onNextMatch={handleNextMatch}
            onPrevMatch={handlePrevMatch}
            matchCount={matchCount}
            currentMatchIndex={currentMatchIndex}
            searchRef={searchInputRef}
          />

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {activeTab === 'body' && (
              <ResponseBody
                body={response.body}
                contentType={response.contentType}
                sizeBytes={response.sizeBytes}
                mode={bodyMode}
                searchQuery={searchQuery}
                currentMatchIndex={currentMatchIndex}
                onMatchCountChange={setMatchCount}
                onCreateTest={handleOpenCreateTestFromNode}
                onCreateExtraction={handleOpenCreateExtraction}
              />
            )}

            {activeTab === 'headers' && (
              <ResponseHeaders
                headers={response.headers}
                onCreateTest={(assertion) => handleOpenAssertionBuilder(assertion, `Verify Header ${assertion.path}`)}
              />
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

      {/* Create Test Dialog */}
      {testDialogState.isOpen && (
        <CreateTestFromResponseDialog
          isOpen={testDialogState.isOpen}
          onClose={() => setTestDialogState({ isOpen: false, assertion: null, testName: '' })}
          workspaceId={workspaceId}
          requestId={currentRequestId}
          initialAssertion={testDialogState.assertion}
          initialTestName={testDialogState.testName}
        />
      )}

      {/* Create Extraction Dialog */}
      {extractionDialogState.isOpen && (
        <CreateExtractionDialog
          isOpen={extractionDialogState.isOpen}
          onClose={() =>
            setExtractionDialogState({ isOpen: false, path: '', source: 'json', value: undefined })
          }
          initialPath={extractionDialogState.path}
          initialSource={extractionDialogState.source}
          value={extractionDialogState.value}
        />
      )}

      {/* Create Request from URL Dialog */}
      {isCreateRequestOpen && (
        <CreateRequestDialog
          isOpen={isCreateRequestOpen}
          onClose={() => setIsCreateRequestOpen(false)}
          workspaceId={workspaceId}
          collectionId={collectionId}
          initialUrl={response?.url || 'https://httpbin.org/get'}
          initialMethod="GET"
          initialName="Request from URL"
        />
      )}
    </div>
  );
}
