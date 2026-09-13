import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
import { useRequestQuery, useUpdateRequestMutation } from '../hooks/useRequest';
import { useRequestExecution } from '../hooks/useRequestExecution';
import { useApiTestsQuery } from '../../testing/hooks/useApiTests';
import { useCollectionsQuery } from '../../workspace/hooks/useWorkspace';
import { useVariableSuggestions, extractVariableNames } from '../hooks/useVariableSuggestions';
import useRequestStore from '../store/requestStore';
import useResponseStore from '../../response/store/responseStore';
import { Loader2, AlertCircle, Globe, AlertTriangle } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function RequestWorkspace({ workspaceId: propWId, collectionId: propCId, requestId: propRId }) {
  const routeParams = useParams();
  const workspaceId = propWId || routeParams.workspaceId;
  const collectionId = propCId || routeParams.collectionId;
  const requestId = propRId || routeParams.requestId;

  const { data: collections = [] } = useCollectionsQuery(workspaceId);
  const activeCollection = collections.find((c) => c.id === collectionId);
  const collectionName = activeCollection?.name;

  const { isLoading, error } = useRequestQuery(workspaceId, collectionId, requestId);
  const { data: tests = [] } = useApiTestsQuery(workspaceId, requestId);
  const updateMutation = useUpdateRequestMutation(workspaceId, collectionId, requestId);
  const executeMutation = useRequestExecution(workspaceId, collectionId, requestId);

  // Resizable split state (Desktop)
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
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
    updateHeader,
    addHeader,
    removeHeader,
    setAuthType,
    updateAuthBearer,
    updateAuthBasic,
    updateAuthApiKey,
    setBodyMode,
    setBodyRaw,
    updateBodyUrlEncoded,
    addBodyUrlEncoded,
    removeBodyUrlEncoded,
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
    }

    return Array.from(new Set(rawTokens));
  }, [url, queryParams, headers, auth, body]);

  const undefinedVariables = useMemo(() => {
    return allReferencedVariables.filter((name) => !isVariableKnown(name));
  }, [allReferencedVariables, isVariableKnown]);

  // Save handler
  const handleSave = useCallback(() => {
    if (!workspaceId || !collectionId || !requestId) return;
    const payload = getCleanPayload();
    updateMutation.mutate(payload);
  }, [workspaceId, collectionId, requestId, getCleanPayload, updateMutation]);

  // Execute handler
  const handleExecute = useCallback(() => {
    if (!workspaceId || !collectionId || !requestId) return;
    executeMutation.mutate();
  }, [workspaceId, collectionId, requestId, executeMutation]);

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
      const clamped = Math.min(Math.max(rawPercent, 25), 75);
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
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPercent((prev) => Math.min(prev + 2, 75));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSplitPercent(25);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSplitPercent(75);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setSplitPercent(50);
    }
  };

  // Global keyboard shortcuts: Ctrl+S to Save, Ctrl+Enter to Send
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleExecute]);

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
        collectionName={collectionName}
        requestId={requestId}
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
              />
            </div>

            {/* Active Environment & Variable Status Indicator Bar */}
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-mono select-none flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Globe size={12} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
                <span>
                  Environment:{' '}
                  <span className={activeEnv ? 'text-sky-300 font-medium' : 'text-slate-500'}>
                    {activeEnv ? activeEnv.name : 'No Environment'}
                  </span>
                </span>
              </div>

              {/* Variables Used Status */}
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
            hasBody={hasBody}
          />

          {/* Active Tab Configuration Panel */}
          <div className="flex-1 overflow-y-auto bg-[#0d0f14]">
            {activeTab === 'params' && (
              <ParamsEditor
                queryParams={queryParams}
                onUpdateParam={updateQueryParam}
                onAddParam={addQueryParam}
                onRemoveParam={removeQueryParam}
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
                onModeChange={setBodyMode}
                onRawChange={setBodyRaw}
                onUpdateUrlEncoded={updateBodyUrlEncoded}
                onAddUrlEncoded={addBodyUrlEncoded}
                onRemoveUrlEncoded={removeBodyUrlEncoded}
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
          <ResponseInspector requestId={requestId} />
        </div>
      </div>
    </div>
  );
}
