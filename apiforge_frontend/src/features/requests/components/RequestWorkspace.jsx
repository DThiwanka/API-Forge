import { useEffect, useCallback } from 'react';
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
import ResponseInspector from '../../response/components/ResponseInspector';
import { useRequestQuery, useUpdateRequestMutation } from '../hooks/useRequest';
import { useRequestExecution } from '../hooks/useRequestExecution';
import useRequestStore from '../store/requestStore';
import { Loader2, AlertCircle } from 'lucide-react';

export default function RequestWorkspace({ workspaceId: propWId, collectionId: propCId, requestId: propRId }) {
  const routeParams = useParams();
  const workspaceId = propWId || routeParams.workspaceId;
  const collectionId = propCId || routeParams.collectionId;
  const requestId = propRId || routeParams.requestId;

  const { isLoading, error } = useRequestQuery(workspaceId, collectionId, requestId);
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
          </div>

          {/* Configuration Section Tabs */}
          <RequestTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            paramsCount={enabledParamsCount}
            headersCount={enabledHeadersCount}
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

