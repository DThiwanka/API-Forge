import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RequestMethodSelector from './RequestMethodSelector';
import RequestUrlInput from './RequestUrlInput';
import RequestSendButton from './RequestSendButton';
import RequestHeader from './RequestHeader';
import RequestTabs from './RequestTabs';
import ParamsEditor from './ParamsEditor';
import HeadersEditor from './HeadersEditor';
import AuthEditor from './AuthEditor';
import BodyEditor from './BodyEditor';
import RequestSettings from './RequestSettings';
import TestPanel from '../../testing/components/TestPanel';
import ResponseInspector from '../../response/components/ResponseInspector';
import VariableToken from './VariableToken';
import RequestPreviewModal from './RequestPreviewModal';
import RequestExecutionStatus from './RequestExecutionStatus';
import {
  useRequestQuery,
  useUpdateRequestMutation,
  useDuplicateRequestMutation,
  useDeleteRequestMutation,
} from '../hooks/useRequest';
import { useRequestExecution } from '../hooks/useRequestExecution';
import { useApiTestsQuery } from '../../testing/hooks/useApiTests';
import { useCollectionsQuery } from '../../workspace/hooks/useWorkspace';
import { useVariableSuggestions, extractVariableNames } from '../hooks/useVariableSuggestions';
import { validateRequestBeforeSend } from '../utils/executionUtils';
import useRequestStore from '../store/requestStore';
import RequestSaveButton from './RequestSaveButton';
import { checkMethodBodyCompatibility } from '../utils/requestMethods';
import useResponseStore from '../../response/store/responseStore';
import { useToastStore } from '../../../stores/toastStore';
import { Loader2, AlertCircle, Globe, AlertTriangle, Eye, Info, Columns2, PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestWorkspace({ workspaceId: propWId, collectionId: propCId, requestId: propRId }) {
  const routeParams = useParams();
  const navigate = useNavigate();
  const workspaceId = propWId || routeParams.workspaceId;
  const collectionId = propCId || routeParams.collectionId;
  const requestId = propRId || routeParams.requestId;

  const { data: collections = [] } = useCollectionsQuery(workspaceId);
  const activeCollection = collections.find((c) => c.id === collectionId);
  const collectionName = activeCollection?.name;

  const { isLoading, error } = useRequestQuery(workspaceId, collectionId, requestId);
  const { data: tests = [] } = useApiTestsQuery(workspaceId, requestId);
  const updateMutation = useUpdateRequestMutation(workspaceId, collectionId, requestId);
  const duplicateMutation = useDuplicateRequestMutation(workspaceId, collectionId);
  const deleteMutation = useDeleteRequestMutation(workspaceId, collectionId);
  const executeMutation = useRequestExecution(workspaceId, collectionId, requestId);

  // Resizable split state (Desktop)
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const splitContainerRef = useRef(null);

  // Variable suggestions and detection across workspace
  const {
    allVariables,
    knownVariableKeys,
    activeEnv,
    getVariable,
    isVariableKnown,
  } = useVariableSuggestions(workspaceId);

  // Sync active requestId with response store for tab isolation
  useEffect(() => {
    if (requestId) {
      useResponseStore.getState().setActiveRequestId(requestId);
    }
  }, [requestId]);

  // Store state
  const {
    name,
    method,
    url,
    queryParams,
    headers,
    auth,
    body,
    settings,
    isDirty,
    isSaving,
    isExecuting,
    activeTab,
    setName,
    setMethod,
    setUrl,
    setActiveTab,
    updateQueryParam,
    addQueryParam,
    removeQueryParam,
    duplicateQueryParam,
    enableAllQueryParams,
    clearAllQueryParams,
    updateHeader,
    addHeader,
    removeHeader,
    duplicateHeader,
    enableAllHeaders,
    clearAllHeaders,
    setHeaderKeyValue,
    setAuthType,
    updateAuthBearer,
    updateAuthBasic,
    updateAuthApiKey,
    setBodyMode,
    setBodyRaw,
    clearBodyRaw,
    updateBodyUrlEncoded,
    addBodyUrlEncoded,
    duplicateBodyUrlEncoded,
    removeBodyUrlEncoded,
    enableAllBodyUrlEncoded,
    clearBodyUrlEncoded,
    updateBodyFormData,
    addBodyFormData,
    duplicateBodyFormData,
    removeBodyFormData,
    enableAllBodyFormData,
    clearBodyFormData,
    updateSetting,
    getCleanPayload,
  } = useRequestStore();

  // Extract all variables referenced anywhere in the request
  const allReferencedVariables = useMemo(() => {
    const rawTokens = [];

    // URL
    if (url) rawTokens.push(...extractVariableNames(url));

    // Query params
    if (Array.isArray(queryParams)) {
      for (const p of queryParams) {
        if (p.enabled !== false) {
          rawTokens.push(...extractVariableNames(p.key));
          rawTokens.push(...extractVariableNames(p.value));
        }
      }
    }

    // Headers
    if (Array.isArray(headers)) {
      for (const h of headers) {
        if (h.enabled !== false) {
          rawTokens.push(...extractVariableNames(h.key));
          rawTokens.push(...extractVariableNames(h.value));
        }
      }
    }

    // Auth
    if (auth?.type === 'bearer' && auth.bearer?.token) {
      rawTokens.push(...extractVariableNames(auth.bearer.token));
    } else if (auth?.type === 'basic') {
      if (auth.basic?.username) rawTokens.push(...extractVariableNames(auth.basic.username));
      if (auth.basic?.password) rawTokens.push(...extractVariableNames(auth.basic.password));
    } else if (auth?.type === 'api-key') {
      if (auth.apiKey?.key) rawTokens.push(...extractVariableNames(auth.apiKey.key));
      if (auth.apiKey?.value) rawTokens.push(...extractVariableNames(auth.apiKey.value));
    }

    // Body
    if (body?.mode === 'json' || body?.mode === 'text' || body?.mode === 'raw') {
      if (body.raw) rawTokens.push(...extractVariableNames(body.raw));
    } else if (body?.mode === 'x-www-form-urlencoded' && Array.isArray(body.urlencoded)) {
      for (const item of body.urlencoded) {
        if (item.enabled !== false) {
          rawTokens.push(...extractVariableNames(item.key));
          rawTokens.push(...extractVariableNames(item.value));
        }
      }
    } else if (body?.mode === 'form-data' && Array.isArray(body.formData)) {
      for (const item of body.formData) {
        if (item.enabled !== false) {
          rawTokens.push(...extractVariableNames(item.key));
          if (item.type !== 'file') {
            rawTokens.push(...extractVariableNames(item.value));
          }
        }
      }
    }

    return Array.from(new Set(rawTokens));
  }, [url, queryParams, headers, auth, body]);

  const undefinedVariables = useMemo(() => {
    return allReferencedVariables.filter((name) => !isVariableKnown(name));
  }, [allReferencedVariables, isVariableKnown]);

  // Method + Body compatibility notice
  const methodBodyNotice = useMemo(() => {
    return checkMethodBodyCompatibility(method, body);
  }, [method, body]);

  // Save handler
  const handleSave = useCallback(() => {
    if (!workspaceId || !collectionId || !requestId) return;
    const payload = getCleanPayload();
    updateMutation.mutate(payload);
  }, [workspaceId, collectionId, requestId, getCleanPayload, updateMutation]);

  // Duplicate handler
  const handleDuplicate = useCallback(() => {
    if (!workspaceId || !collectionId || !requestId) return;
    duplicateMutation.mutate(requestId, {
      onSuccess: (newReq) => {
        useToastStore.getState().toast.success(`Duplicated "${name || 'Request'}"`);
        if (newReq?.id) {
          navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${newReq.id}`);
        }
      },
      onError: (err) => {
        useToastStore.getState().toast.error(`Failed to duplicate request: ${err.message}`);
      },
    });
  }, [workspaceId, collectionId, requestId, name, duplicateMutation, navigate]);

  // Delete handler
  const handleDelete = useCallback(() => {
    if (!workspaceId || !collectionId || !requestId) return;
    deleteMutation.mutate(requestId, {
      onSuccess: () => {
        useToastStore.getState().toast.success(`Deleted "${name || 'Request'}"`);
        navigate(`/workspace/${workspaceId}/collections/${collectionId}`);
      },
      onError: (err) => {
        useToastStore.getState().toast.error(`Failed to delete request: ${err.message}`);
      },
    });
  }, [workspaceId, collectionId, requestId, name, deleteMutation, navigate]);

  // Subscribe to current request response state
  const responseState = useResponseStore(
    useCallback((s) => s.getResponseState(requestId), [requestId])
  );

  // Live timer during execution
  const [execElapsedMs, setExecElapsedMs] = useState(0);
  useEffect(() => {
    if (!isExecuting) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      setExecElapsedMs(Date.now() - startTime);
    }, 50);
    return () => clearInterval(interval);
  }, [isExecuting]);

  // Execute handler with pre-flight validation and duplicate submission protection
  const handleExecute = useCallback(() => {
    if (!workspaceId || !collectionId || !requestId) return;
    if (isExecuting || executeMutation.isPending) return;

    const validation = validateRequestBeforeSend(
      { url, method, body },
      { knownVariableKeys }
    );

    if (!validation.isValid) {
      useToastStore.getState().toast.error(validation.error || 'Please enter a valid request URL.');
      return;
    }

    executeMutation.mutate();
  }, [workspaceId, collectionId, requestId, isExecuting, executeMutation, url, method, body, knownVariableKeys]);

  // Drag listeners for panel resizing
  const handleSplitMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const rawPercent = (pointerX / rect.width) * 100;
      const clamped = Math.min(Math.max(rawPercent, 20), 80);
      setSplitPercent(Math.round(clamped * 10) / 10);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDividerKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSplitPercent((prev) => Math.max(prev - 2, 25));
      setSplitPercent((prev) => Math.max(prev - 2, 20));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPercent((prev) => Math.min(prev + 2, 75));
      setSplitPercent((prev) => Math.min(prev + 2, 80));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitPercent(25);
      setSplitPercent(20);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSplitPercent(75);
      setSplitPercent(80);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setSplitPercent(50);
    }
  };

  // Global keyboard shortcuts: Ctrl+S to Save, Ctrl+Enter to Send
  // Global keyboard shortcuts: Ctrl+S to Save, Ctrl+Enter to Send, Alt+1..6 for Config Tabs
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleExecute();
      } else if ((isCtrlOrCmd && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('apiforge:focus-url'));
      } else if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('params');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('headers');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('auth');
        } else if (e.key === '4') {
          e.preventDefault();
          setActiveTab('body');
        } else if (e.key === '5') {
          e.preventDefault();
          setActiveTab('settings');
        } else if (e.key === '6') {
          e.preventDefault();
          setActiveTab('tests');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleExecute, setActiveTab]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#090a0f]">
        <Loader2 size={28} className="animate-spin text-sky-500 mb-2" />
        <span className="text-xs font-mono">Loading request definition...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#090a0f]">
        <AlertCircle size={28} className="text-rose-400 mb-2" />
        <span className="text-xs font-mono text-rose-300">
          Failed to load request: {error.message}
        </span>
      </div>
    );
  }

  const enabledParamsCount = (queryParams || []).filter((p) => p.enabled !== false && p.key?.trim()).length;
  const enabledHeadersCount = (headers || []).filter((h) => h.enabled !== false && h.key?.trim()).length;
  const extractionsCount = (settings?.extract || []).length;
  const hasAuth = auth?.type && auth.type !== 'none';
  const hasBody = body?.mode && body.mode !== 'none';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] overflow-hidden select-text">
      {/* 1. Request Header: Name + Breadcrumb + Save button */}
      <RequestHeader
        name={name}
        onNameChange={setName}
        isDirty={isDirty}
        isSaving={isSaving}
        isError={updateMutation.isError}
        onSave={handleSave}
        workspaceId={workspaceId}
        collectionId={collectionId}
        collectionName={collectionName}
        requestId={requestId}
        url={url}
        method={method}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />

      {/* Main Split Grid: Request Editor (left) & Response Inspector (right) */}
      <div
        ref={splitContainerRef}
        style={{
          '--split-left': `${splitPercent}%`,
          '--split-right': `${100 - splitPercent}%`,
        }}
        className={cn(
          'flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative',
          isDragging && 'select-none'
        )}
      >
        {isDragging && (
          <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />
        )}

        {/* LEFT PANE: REQUEST CONFIGURATION */}
        <div className="w-full lg:w-[var(--split-left)] flex flex-col min-w-0 border-b lg:border-b-0 border-[#232732] overflow-hidden shrink-0">
          {/* Method + URL + Send Input Bar */}
          <div className="p-4 bg-[#111318] border-b border-[#232732]">
            <div className="flex items-stretch rounded-md shadow-sm">
              <RequestMethodSelector
                value={method}
                onChange={setMethod}
              />
              <RequestUrlInput
                value={url}
                onChange={setUrl}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleExecute();
                  }
                }}
                variables={allVariables}
                knownVariableKeys={knownVariableKeys}
                activeEnvName={activeEnv?.name}
                getVariable={getVariable}
              />
              <RequestSendButton
                isExecuting={isExecuting}
                onSend={handleExecute}
                disabled={!url || !url.trim()}
                className="rounded-none border-r border-[#2b313e]"
              />
              <RequestSaveButton
                isSaving={isSaving}
                isDirty={isDirty}
                isError={updateMutation.isError}
                onSave={handleSave}
                className="rounded-l-none rounded-r-md border-l-0"
              />
            </div>

            {/* Method + Body Compatibility Notice */}
            {methodBodyNotice.hasNotice && (
              <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/25 border border-amber-800/40 text-[11px] font-sans text-amber-300 select-none">
                <Info size={12} className="shrink-0 text-amber-400" />
                <span>{methodBodyNotice.message}</span>
              </div>
            )}

            {/* Active Environment & Variable Status Indicator Bar */}
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-mono select-none flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Globe size={12} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
                  <span>
                    Environment:{' '}
                    <span className={activeEnv ? 'text-sky-300 font-medium' : 'text-slate-500'}>
                      {activeEnv ? activeEnv.name : 'No Environment'}
                    </span>
                  </span>
                </div>

                {/* Execution Lifecycle Status */}
                <RequestExecutionStatus
                  isExecuting={isExecuting}
                  status={responseState.status}
                  response={responseState.response}
                  error={responseState.error}
                  elapsedMs={execElapsedMs}
                />
              </div>

              {/* Variables Used Status and Preview Button */}
              <div className="flex items-center gap-2 flex-wrap">
                {undefinedVariables.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-amber-950/60 border border-amber-600/50 text-amber-300"
                    title={`${undefinedVariables.length} variable(s) used in this request are undefined in the active environment, extractions, or runtime.`}
                  >
                    <AlertTriangle size={11} className="text-amber-400" />
                    <span>{undefinedVariables.length} undefined</span>
                  </span>
                )}

                {allReferencedVariables.length > 0 && (
                  <div className="flex items-center gap-1 text-slate-400 flex-wrap">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-sans">
                      Used ({allReferencedVariables.length}):
                    </span>
                    {allReferencedVariables.map((v) => {
                      const meta = getVariable(v);
                      const isKnown = isVariableKnown(v);
                      return (
                        <VariableToken
                          key={v}
                          name={v}
                          isKnown={isKnown}
                          source={meta?.source || 'environment'}
                          isSecret={meta?.isSecret}
                          previewValue={meta?.value}
                          envName={meta?.envName || activeEnv?.name}
                          description={meta?.description}
                          className="py-0.2 text-[10px]"
                        />
                      );
                    })}
                  </div>
                )}

                {/* Quick Split Layout Presets */}
                <div
                  className="hidden lg:flex items-center rounded bg-[#181b22] border border-[#2b313e] p-0.5"
                  role="group"
                  aria-label="Panel layout presets"
                >
                  <button
                    type="button"
                    onClick={() => setSplitPercent(80)}
                    className={cn(
                      'p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer',
                      splitPercent >= 75 && 'bg-sky-500/20 text-sky-300'
                    )}
                    title="Focus Request Editor (80% / 20%)"
                    aria-label="Focus Request Editor"
                  >
                    <PanelLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitPercent(50)}
                    className={cn(
                      'p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer',
                      splitPercent === 50 && 'bg-sky-500/20 text-sky-300'
                    )}
                    title="Balanced Split (50% / 50%)"
                    aria-label="Balanced Split"
                  >
                    <Columns2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitPercent(25)}
                    className={cn(
                      'p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer',
                      splitPercent <= 30 && 'bg-sky-500/20 text-sky-300'
                    )}
                    title="Maximize Response Panel (25% / 75%)"
                    aria-label="Maximize Response Panel"
                  >
                    <PanelRight size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181b22] hover:bg-[#222733] border border-[#2b313e] hover:border-sky-500/50 text-[11px] font-medium font-sans text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Preview composed HTTP request before execution"
                >
                  <Eye size={12} className="text-sky-400" />
                  <span>Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* Configuration Section Tabs */}
          <RequestTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            paramsCount={enabledParamsCount}
            headersCount={enabledHeadersCount}
            testsCount={tests.length}
            extractionsCount={extractionsCount}
            hasAuth={hasAuth}
            authType={auth?.type}
            hasBody={hasBody}
            bodyMode={body?.mode}
          />

          {/* Active Tab Configuration Panel */}
          <div className="flex-1 overflow-y-auto bg-[#0d0f14]">
            {activeTab === 'params' && (
              <ParamsEditor
                queryParams={queryParams}
                onUpdateParam={updateQueryParam}
                onAddParam={addQueryParam}
                onRemoveParam={removeQueryParam}
                onDuplicateParam={duplicateQueryParam}
                onEnableAll={enableAllQueryParams}
                onClearAll={clearAllQueryParams}
                variables={allVariables}
                activeEnvName={activeEnv?.name}
              />
            )}

            {activeTab === 'headers' && (
              <HeadersEditor
                headers={headers}
                onUpdateHeader={updateHeader}
                onAddHeader={addHeader}
                onRemoveHeader={removeHeader}
                onDuplicateHeader={duplicateHeader}
                onEnableAll={enableAllHeaders}
                onClearAll={clearAllHeaders}
                onQuickAddHeader={setHeaderKeyValue}
                variables={allVariables}
                activeEnvName={activeEnv?.name}
              />
            )}

            {activeTab === 'auth' && (
              <AuthEditor
                auth={auth}
                onAuthTypeChange={setAuthType}
                onUpdateBearer={updateAuthBearer}
                onUpdateBasic={updateAuthBasic}
                onUpdateApiKey={updateAuthApiKey}
                variables={allVariables}
                activeEnvName={activeEnv?.name}
              />
            )}

            {activeTab === 'body' && (
              <BodyEditor
                body={body}
                headers={headers}
                onModeChange={setBodyMode}
                onRawChange={setBodyRaw}
                onClearRaw={clearBodyRaw}
                onUpdateUrlEncoded={updateBodyUrlEncoded}
                onAddUrlEncoded={addBodyUrlEncoded}
                onDuplicateUrlEncoded={duplicateBodyUrlEncoded}
                onRemoveUrlEncoded={removeBodyUrlEncoded}
                onEnableAllUrlEncoded={enableAllBodyUrlEncoded}
                onClearUrlEncoded={clearBodyUrlEncoded}
                onUpdateFormData={updateBodyFormData}
                onAddFormData={addBodyFormData}
                onDuplicateFormData={duplicateBodyFormData}
                onRemoveFormData={removeBodyFormData}
                onEnableAllFormData={enableAllBodyFormData}
                onClearFormData={clearBodyFormData}
                onSetHeaderKeyValue={setHeaderKeyValue}
                variables={allVariables}
                activeEnvName={activeEnv?.name}
              />
            )}

            {activeTab === 'settings' && (
              <RequestSettings
                settings={settings}
                onUpdateSetting={updateSetting}
              />
            )}

            {activeTab === 'tests' && (
              <TestPanel
                workspaceId={workspaceId}
                requestId={requestId}
              />
            )}
          </div>
        </div>

        {/* Resizable Divider Handle (Desktop) */}
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-valuenow={Math.round(splitPercent)}
          aria-valuemin={25}
          aria-valuemax={75}
          aria-valuemin={20}
          aria-valuemax={80}
          aria-label="Resize request and response panels"
          onMouseDown={handleSplitMouseDown}
          onDoubleClick={() => setSplitPercent(50)}
          onKeyDown={handleDividerKeyDown}
          className={cn(
            'hidden lg:flex items-center justify-center w-2 -mx-1 z-20 cursor-col-resize select-none group focus:outline-none shrink-0',
            isDragging && 'cursor-col-resize'
          )}
          title="Drag to resize panels (Double-click to reset to 50%)"
        >
          <div
            className={cn(
              'w-[2px] h-full bg-[#232732] group-hover:bg-sky-500 group-focus:bg-sky-500 transition-colors',
              isDragging && 'bg-sky-500'
            )}
          />
        </div>

        {/* RIGHT PANE: RESPONSE INSPECTOR */}
        <div className="w-full lg:w-[var(--split-right)] flex flex-col min-w-0 overflow-hidden shrink-0">
          <ResponseInspector
            workspaceId={workspaceId}
            collectionId={collectionId}
            requestId={requestId}
            originalUrl={url}
            onRetry={handleExecute}
          />
        </div>
      </div>

      {/* Composed Request Preview Modal */}
      <RequestPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        name={name}
        method={method}
        url={url}
        queryParams={queryParams}
        headers={headers}
        auth={auth}
        body={body}
        allReferencedVariables={allReferencedVariables}
        knownVariableKeys={knownVariableKeys}
        activeEnvName={activeEnv?.name}
        getVariable={getVariable}
      />
    </div>
  );
}
