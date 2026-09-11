import { useEffect, useCallback, useMemo } from 'react';
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
import { useRequestQuery, useUpdateRequestMutation } from '../hooks/useRequest';
import { useRequestExecution } from '../hooks/useRequestExecution';
import { useEnvironmentsQuery } from '../../environments/hooks/useEnvironments';
import { useApiTestsQuery } from '../../testing/hooks/useApiTests';
import useRequestStore from '../store/requestStore';
import { Loader2, AlertCircle, Globe } from 'lucide-react';

export default function RequestWorkspace({ workspaceId: propWId, collectionId: propCId, requestId: propRId }) {
  const routeParams = useParams();
  const workspaceId = propWId || routeParams.workspaceId;
  const collectionId = propCId || routeParams.collectionId;
  const requestId = propRId || routeParams.requestId;

  const { isLoading, error } = useRequestQuery(workspaceId, collectionId, requestId);
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);
  const { data: tests = [] } = useApiTestsQuery(workspaceId, requestId);
  const activeEnv = environments.find((e) => e.isActive);
  const updateMutation = useUpdateRequestMutation(workspaceId, collectionId, requestId);
  const executeMutation = useRequestExecution(workspaceId, collectionId, requestId);

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

  const urlVariables = useMemo(() => {
    if (!url) return [];
    const matches = url.match(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, '').trim()))];
  }, [url]);

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
  const hasAuth = auth?.type && auth.type !== 'none';
  const hasBody = body?.mode && body.mode !== 'none';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] overflow-hidden select-text">
      {/* 1. Request Header: Name + Save button */}
      <RequestHeader
        name={name}
        onNameChange={setName}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        workspaceId={workspaceId}
        requestId={requestId}
      />

      {/* Main Split Grid: Request Editor (left) & Response Inspector (right) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT PANE: REQUEST CONFIGURATION */}
        <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-[#232732] overflow-hidden">
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
              />
              <RequestSendButton
                isExecuting={isExecuting}
                onSend={handleExecute}
                disabled={!url || !url.trim()}
              />
            </div>

            {/* Active Environment & Variable Status Indicator */}
            <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono select-none">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Globe size={11} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
                <span>
                  Environment:{' '}
                  <span className={activeEnv ? 'text-sky-300 font-medium' : 'text-slate-500'}>
                    {activeEnv ? activeEnv.name : 'No Environment'}
                  </span>
                </span>
              </div>

              {urlVariables.length > 0 && (
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Variables:</span>
                  {urlVariables.map((v) => (
                    <span
                      key={v}
                      className="px-1.5 py-0.2 rounded bg-[#181b22] border border-[#2b313e] text-sky-400 text-[10px]"
                      title={`Variable referenced in URL: {{${v}}}`}
                    >
                      &#123;&#123;{v}&#125;&#125;
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Configuration Section Tabs */}
          <RequestTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            paramsCount={enabledParamsCount}
            headersCount={enabledHeadersCount}
            testsCount={tests.length}
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
              />
            )}

            {activeTab === 'headers' && (
              <HeadersEditor
                headers={headers}
                onUpdateHeader={updateHeader}
                onAddHeader={addHeader}
                onRemoveHeader={removeHeader}
              />
            )}

            {activeTab === 'auth' && (
              <AuthEditor
                auth={auth}
                onAuthTypeChange={setAuthType}
                onUpdateBearer={updateAuthBearer}
                onUpdateBasic={updateAuthBasic}
                onUpdateApiKey={updateAuthApiKey}
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

        {/* RIGHT PANE: RESPONSE INSPECTOR */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ResponseInspector />
        </div>
      </div>
    </div>
  );
}

