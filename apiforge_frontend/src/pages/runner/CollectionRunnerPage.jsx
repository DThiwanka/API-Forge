import { useState, useEffect, useMemo } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Play,
  Layers,
  ChevronDown,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Settings2,
} from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import CollectionTree from '../../features/collections/components/CollectionTree';
import RunnerSelectionTree from '../../features/runner/components/RunnerSelectionTree';
import RunnerEnvironmentSelector from '../../features/runner/components/RunnerEnvironmentSelector';
import RuntimeVariablesEditor from '../../features/runner/components/RuntimeVariablesEditor';
import RunnerResults from '../../features/runner/components/RunnerResults';
import RunnerConfigSummary from '../../features/runner/components/RunnerConfigSummary';
import { useWorkspacesQuery, useWorkspaceQuery } from '../../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { useCollectionsQuery, useFoldersQuery } from '../../features/collections/hooks/useCollections';
import { useEnvironmentsQuery } from '../../features/environments/hooks/useEnvironments';
import { listRequests } from '../../features/requests/services/requestApi';
import { useCollectionRunnerMutation } from '../../features/runner/hooks/useCollectionRunner';
import { useQuery } from '@tanstack/react-query';

export default function CollectionRunnerPage() {
  const { workspaceId: routeWorkspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: workspaces = [],
    error: workspaceError,
  } = useWorkspacesQuery();

  const currentWorkspaceId =
    routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const { data: workspace } = useWorkspaceQuery(currentWorkspaceId);

  // Sync workspace to store
  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /workspace/:workspaceId/runner without valid id, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}/runner`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

  // Fetch collections in this workspace
  const {
    data: collections = [],
    isLoading: loadingCollections,
  } = useCollectionsQuery(currentWorkspaceId);

  // Fetch environments in this workspace to resolve active/selected name
  const { data: environments = [] } = useEnvironmentsQuery(currentWorkspaceId);

  // Collection selection logic
  const paramCollectionId = searchParams.get('collectionId');
  const selectedCollectionId = useMemo(() => {
    if (collections.length === 0) return null;
    if (paramCollectionId && collections.some((c) => c.id === paramCollectionId)) {
      return paramCollectionId;
    }
    return collections[0]?.id || null;
  }, [collections, paramCollectionId]);

  const selectedCollection = useMemo(() => {
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  // Handle collection change from dropdown
  const handleSelectCollection = (colId) => {
    setSearchParams({ collectionId: colId });
    setManualSelectedRequestIds(null);
    setRunData(null);
    setRunError(null);
  };

  // Fetch folders and requests for selected collection
  const { data: folders = [], isLoading: loadingFolders } = useFoldersQuery(
    currentWorkspaceId,
    selectedCollectionId
  );

  const {
    data: requests = [],
    isLoading: loadingRequests,
  } = useQuery({
    queryKey: ['requests', currentWorkspaceId, selectedCollectionId],
    queryFn: () => listRequests(currentWorkspaceId, selectedCollectionId),
    enabled: Boolean(currentWorkspaceId && selectedCollectionId),
  });

  // Runner Configuration State
  const [manualSelectedRequestIds, setManualSelectedRequestIds] = useState(null);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
  const [runtimeVariables, setRuntimeVariables] = useState([]);
  const [stopOnError, setStopOnError] = useState(false);
  const [executeTests, setExecuteTests] = useState(true);

  // Compute active selected request IDs (defaults to all requests in collection)
  const selectedRequestIds = useMemo(() => {
    if (manualSelectedRequestIds !== null) {
      return manualSelectedRequestIds.filter((id) => requests.some((r) => r.id === id));
    }
    return requests.map((r) => r.id);
  }, [requests, manualSelectedRequestIds]);

  // Resolve environment label without exposing secrets
  const activeEnv = useMemo(
    () => environments.find((e) => e.isActive) || null,
    [environments]
  );
  const resolvedEnvName = useMemo(() => {
    if (selectedEnvironmentId === 'none') return 'No Environment';
    if (selectedEnvironmentId) {
      const found = environments.find((e) => e.id === selectedEnvironmentId);
      return found ? found.name : 'Unknown';
    }
    return activeEnv ? `${activeEnv.name} (Active)` : 'None';
  }, [selectedEnvironmentId, environments, activeEnv]);

  // Compute folder count with at least one selected request
  const selectedFolderCount = useMemo(() => {
    let count = 0;
    for (const folder of folders) {
      if (requests.some((r) => r.folderId === folder.id && selectedRequestIds.includes(r.id))) {
        count++;
      }
    }
    return count;
  }, [folders, requests, selectedRequestIds]);

  // Compute runtime variable count
  const runtimeVariableCount = useMemo(() => {
    return runtimeVariables.filter((v) => v.key && v.key.trim().length > 0).length;
  }, [runtimeVariables]);

  // Selection handlers
  const handleToggleRequest = (requestId) => {
    if (selectedRequestIds.includes(requestId)) {
      setManualSelectedRequestIds(selectedRequestIds.filter((id) => id !== requestId));
    } else {
      setManualSelectedRequestIds([...selectedRequestIds, requestId]);
    }
  };

  const handleToggleFolder = (_folderId, descendantIds, isCurrentlyActive) => {
    const set = new Set(selectedRequestIds);
    if (isCurrentlyActive) {
      descendantIds.forEach((id) => set.delete(id));
    } else {
      descendantIds.forEach((id) => set.add(id));
    }
    setManualSelectedRequestIds(Array.from(set));
  };

  const handleSelectAll = () => {
    setManualSelectedRequestIds(requests.map((r) => r.id));
  };

  const handleDeselectAll = () => {
    setManualSelectedRequestIds([]);
  };

  // Execution State & Mutation
  const [runData, setRunData] = useState(null);
  const [runError, setRunError] = useState(null);

  const runnerMutation = useCollectionRunnerMutation(
    currentWorkspaceId,
    selectedCollectionId
  );

  // Permission check: VIEWER role cannot run
  const canRun = workspace?.role !== 'VIEWER';

  const handleRun = async () => {
    if (!currentWorkspaceId || !selectedCollectionId || selectedRequestIds.length === 0) {
  const handleRun = useCallback(async () => {
    if (
      !currentWorkspaceId ||
      !selectedCollectionId ||
      selectedRequestIds.length === 0 ||
      runnerMutation.isPending
    ) {
      return;
    }

    // Reset previous run data immediately so user sees new run starting
    setRunData(null);
    setRunError(null);

    // Build payload
    const payload = {
      stopOnError,
      executeTests,
    };

    // If partial selection, pass explicit requestIds
    if (selectedRequestIds.length !== requests.length || selectedRequestIds.length > 0) {
      payload.requestIds = selectedRequestIds;
    }

    // Environment
    if (selectedEnvironmentId === 'none') {
      payload.environmentId = null;
    } else if (selectedEnvironmentId) {
      payload.environmentId = selectedEnvironmentId;
    }

    // Runtime variables
    // Runtime variables (ephemeral only)
    const varsRecord = {};
    for (const v of runtimeVariables) {
      if (v.key && v.key.trim()) {
        varsRecord[v.key.trim()] = v.value ?? '';
      }
    }
    if (Object.keys(varsRecord).length > 0) {
      payload.runtimeVariables = varsRecord;
    }

    try {
      const responseData = await runnerMutation.mutateAsync(payload);
      setRunData(responseData.run || responseData);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Collection execution failed';
      setRunError(message);
    }
  };
  }, [
    currentWorkspaceId,
    selectedCollectionId,
    selectedRequestIds,
    requests.length,
    runnerMutation,
    stopOnError,
    executeTests,
    selectedEnvironmentId,
    runtimeVariables,
  ]);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run collection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (canRun && !runnerMutation.isPending && selectedRequestIds.length > 0) {
          handleRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canRun, runnerMutation.isPending, selectedRequestIds, handleRun]);

  // Handle unauthorized
  if (workspaceError?.response?.status === 401) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#090a0f] text-slate-400">
          <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Play size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Sign in to configure and execute collections in the runner.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            Sign In to APIForge
          </button>
        </div>
      </AppShell>
    );
  }

  const isLoadingDetails = loadingCollections || loadingFolders || loadingRequests;

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex overflow-hidden bg-[#090a0f]">
        {/* Collapsible Collection Tree Sidebar */}
        {!sidebarCollapsed && currentWorkspaceId && (
          <div className="w-64 border-r border-[#232732] bg-[#0c0e14] shrink-0 overflow-y-auto hidden md:block">
            <CollectionTree workspaceId={currentWorkspaceId} />
          </div>
        )}

        {/* Main Runner Area */}
        {/* Main Runner Area: 3-Area Layout */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c11]">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-[#101218] border-b border-[#232732] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none">
          {/* Top Header Bar */}
          <header className="px-4 py-3 bg-[#101218] border-b border-[#232732] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none">
            {/* Left Title & Mode */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#181b24] border border-[#2b3140] flex items-center justify-center text-emerald-400">
                <Play size={15} />
              <div className="w-7 h-7 rounded-md bg-[#181b24] border border-[#2b3140] flex items-center justify-center text-emerald-400 shrink-0">
                <Play size={14} className="fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-slate-100 tracking-tight">
                    Collection Runner
                  </h1>
                  {selectedCollection && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-medium">
                      Sequential Mode
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Execute multiple requests in sequence with environment and runtime variables
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Execute selected requests sequentially with chained runtime variables and assertions
                </p>
              </div>
            </div>

            {/* Collection Selector Dropdown */}
            {collections.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden lg:inline">Collection:</span>
            {/* Right Controls: Collection Selector + Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Collection Selector Dropdown */}
              {collections.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedCollectionId || ''}
                    onChange={(e) => handleSelectCollection(e.target.value)}
                    disabled={runnerMutation.isPending}
                    className="h-8 pl-3 pr-8 bg-[#151822] border border-[#2b3140] rounded text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition-colors appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            )}
          </div>
              )}

              {/* Configure Run Button (when viewing results) */}
              {runData && (
                <button
                  type="button"
                  onClick={() => setRunData(null)}
                  className="h-8 px-3 rounded bg-[#161a24] hover:bg-[#202534] text-slate-300 hover:text-white border border-[#2b3140] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Return to configuration editor"
                >
                  <Settings2 size={13} />
                  <span>Configure</span>
                </button>
              )}

              {/* Primary Run Action Button */}
              <button
                type="button"
                onClick={handleRun}
                disabled={
                  !canRun ||
                  runnerMutation.isPending ||
                  isLoadingDetails ||
                  selectedRequestIds.length === 0
                }
                title={
                  selectedRequestIds.length === 0
                    ? 'Select at least one request to run'
                    : 'Execute collection (Ctrl+Enter)'
                }
                aria-label={`Run Collection with ${selectedRequestIds.length} requests`}
                className="h-8 px-3.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer"
              >
                {runnerMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play size={12} className="fill-current" />
                    <span>
                      Run ({selectedRequestIds.length})
                    </span>
                    <span className="hidden sm:inline-block px-1 py-0.2 rounded text-[10px] bg-emerald-800/60 font-mono text-emerald-100 ml-1">
                      Ctrl+↵
                    </span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* Main 2-Column Responsive Body */}
          {collections.length === 0 && !loadingCollections ? (
            /* No Collections in Workspace Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto select-none">
              <div className="w-12 h-12 rounded-xl bg-[#12141c] border border-[#232732] flex items-center justify-center text-slate-500 mb-3 shadow-xl">
                <Layers size={20} />
              </div>
              <h3 className="text-sm font-medium text-slate-200 mb-1">
                No collections found
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Create a collection with requests to execute them sequentially with the runner.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/workspace/${currentWorkspaceId}`)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              >
                Go to Request Editor
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Configuration & Request Selection (w-full lg:w-96) */}
              {/* Area 1: Left Column: Selection Area (w-full lg:w-96) */}
              <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-[#232732] bg-[#0c0e14] flex flex-col shrink-0 overflow-y-auto">
                <div className="p-4 space-y-5">
                <div className="p-4 space-y-4">
                  {/* Permission warning banner if viewer */}
                  {!canRun && (
                    <div className="p-2.5 rounded border border-amber-800/40 bg-amber-950/20 text-amber-300 text-xs flex items-center gap-2">
                      <ShieldAlert size={14} className="shrink-0 text-amber-400" />
                      <span>You have viewer access. Executing runs requires member or admin permissions.</span>
                    </div>
                  )}

                  {/* Request Selection Tree */}
                  <div>
                    <h2 className="text-xs font-semibold text-slate-200 mb-2">
                      Requests to Execute
                    </h2>
                    {loadingRequests ? (
                      <div className="py-6 flex items-center justify-center text-xs text-slate-500 gap-2 font-mono">
                      <div className="py-8 flex items-center justify-center text-xs text-slate-500 gap-2 font-mono">
                        <Loader2 size={13} className="animate-spin" />
                        <span>Loading requests...</span>
                      </div>
                    ) : requests.length === 0 ? (
                      <div className="p-3 rounded border border-dashed border-[#2b3140] bg-[#11131a] text-center text-xs text-slate-500">
                      <div className="p-4 rounded border border-dashed border-[#2b3140] bg-[#11131a] text-center text-xs text-slate-500">
                        No requests found in this collection.
                      </div>
                    ) : (
                      <RunnerSelectionTree
                        folders={folders}
                        requests={requests}
                        selectedRequestIds={selectedRequestIds}
                        onToggleRequest={handleToggleRequest}
                        onToggleFolder={handleToggleFolder}
                        onSelectAll={handleSelectAll}
                        onDeselectAll={handleDeselectAll}
                        disabled={runnerMutation.isPending}
                      />
                    )}
                  </div>

                  <div className="h-px bg-[#1d212b]" />

                  {/* Environment Selector */}
                  <RunnerEnvironmentSelector
                    workspaceId={currentWorkspaceId}
                    selectedEnvironmentId={selectedEnvironmentId}
                    onSelectEnvironment={setSelectedEnvironmentId}
                    disabled={runnerMutation.isPending}
                  />

                  <div className="h-px bg-[#1d212b]" />

                  {/* Runtime Variables Editor */}
                  <RuntimeVariablesEditor
                    variables={runtimeVariables}
                    onChange={setRuntimeVariables}
                    disabled={runnerMutation.isPending}
                  />

                  <div className="h-px bg-[#1d212b]" />

                  {/* Execution Settings */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Execution Settings
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={executeTests}
                        onChange={(e) => setExecuteTests(e.target.checked)}
                        disabled={runnerMutation.isPending}
                        className="w-3.5 h-3.5 rounded bg-[#161922] border-[#2e3444] text-sky-500 focus:ring-sky-500/30 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span>Run saved tests and assertions</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={stopOnError}
                        onChange={(e) => setStopOnError(e.target.checked)}
                        disabled={runnerMutation.isPending}
                        className="w-3.5 h-3.5 rounded bg-[#161922] border-[#2e3444] text-sky-500 focus:ring-sky-500/30 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span>Stop execution on first request error</span>
                    </label>
                  </div>

                  {/* Error banner if execution failed */}
                  {runError && (
                    <div className="p-3 rounded border border-rose-800/40 bg-rose-950/20 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-200">Execution Error</div>
                        <div>{runError}</div>
                      </div>
                    </div>
                  )}

                  {/* Run Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={
                        !canRun ||
                        runnerMutation.isPending ||
                        isLoadingDetails ||
                        selectedRequestIds.length === 0
                      }
                      className="w-full h-9 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none"
                    >
                      {runnerMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Running Collection...</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} className="fill-current" />
                          <span>
                            Run Collection ({selectedRequestIds.length}{' '}
                            {selectedRequestIds.length === 1 ? 'Request' : 'Requests'})
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Execution Progress / Results */}
              {/* Area 2 & 3: Right Column: Configuration / Execution Progress / Results */}
              {/* Right Column: Configuration / Execution Progress / Results */}
              <div className="flex-1 flex flex-col overflow-y-auto bg-[#0a0c11]">
                {/* Pending State */}
                {/* 1. Pending Execution Progress State */}
                {runnerMutation.isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                  <div
                    className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none"
                    aria-live="polite"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#131620] border border-[#2b3140] flex items-center justify-center text-emerald-400 mb-4 shadow-2xl relative">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1">
                      Executing Collection...
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mb-3">
                      Running {selectedRequestIds.length} requests sequentially against your target endpoints.
                    <p className="text-xs text-slate-400 max-w-sm mb-3">
                      Running {selectedRequestIds.length} {selectedRequestIds.length === 1 ? 'request' : 'requests'} sequentially against your target endpoints.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1 rounded-full">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1 rounded-full mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>{selectedCollection?.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono italic">
                      Starting new run — previous results reset.
                    </p>
                  </div>
                )}

                {/* Idle / Ready State */}
                {/* 2. Run Results View */}
                {!runnerMutation.isPending && runData && (
                  <RunnerResults
                    runData={runData}
                    workspaceId={currentWorkspaceId}
                    collectionId={selectedCollectionId}
                    onRunAgain={handleRun}
                    disabled={runnerMutation.isPending}
                  />
                )}

                {/* 3. Idle / Configuration Area */}
                {!runnerMutation.isPending && !runData && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto select-none">
                    <div className="w-14 h-14 rounded-2xl bg-[#11131a] border border-[#232732] flex items-center justify-center text-slate-500 mb-4 shadow-xl">
                      <Sparkles size={24} />
                  <div className="p-5 space-y-5 max-w-3xl">
                    {/* Runner Pre-run Configuration Summary Card */}
                    <RunnerConfigSummary
                      collectionName={selectedCollection?.name}
                      selectedRequestCount={selectedRequestIds.length}
                      totalRequestCount={requests.length}
                      selectedFolderCount={selectedFolderCount}
                      environmentName={resolvedEnvName}
                      runtimeVariableCount={runtimeVariableCount}
                      stopOnError={stopOnError}
                      executeTests={executeTests}
                      onRun={handleRun}
                      canRun={canRun}
                      isRunning={runnerMutation.isPending}
                    />

                    {/* Error banner if previous execution failed */}
                    {runError && (
                      <div className="p-3 rounded border border-rose-800/40 bg-rose-950/20 text-rose-300 text-xs flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0 text-rose-400 mt-0.5" />
                        <div>
                          <div className="font-semibold text-rose-200">Execution Error</div>
                          <div>{runError}</div>
                        </div>
                      </div>
                    )}

                    {/* Environment Configuration */}
                    <div className="p-4 rounded-lg bg-[#10131b] border border-[#232732]">
                      <RunnerEnvironmentSelector
                        workspaceId={currentWorkspaceId}
                        selectedEnvironmentId={selectedEnvironmentId}
                        onSelectEnvironment={setSelectedEnvironmentId}
                        disabled={runnerMutation.isPending}
                      />
                    </div>
                    <h3 className="text-sm font-medium text-slate-200 mb-1">
                      Ready to Execute
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                      Select which folders or requests to include, configure runtime variables or environments, then click <strong className="text-slate-300">Run Collection</strong> to start sequential execution.
                    </p>

                    <div className="w-full max-w-sm p-3 rounded-lg border border-[#1e222c] bg-[#111319] text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Target Collection:</span>
                        <span className="text-slate-200 font-medium truncate max-w-[180px]">
                          {selectedCollection?.name || 'None'}
                        </span>
                    {/* Runtime Variables Editor */}
                    <div className="p-4 rounded-lg bg-[#10131b] border border-[#232732]">
                      <RuntimeVariablesEditor
                        variables={runtimeVariables}
                        onChange={setRuntimeVariables}
                        disabled={runnerMutation.isPending}
                      />
                    </div>

                    {/* Execution Settings */}
                    <div className="p-4 rounded-lg bg-[#10131b] border border-[#232732] space-y-3">
                      <div className="text-xs font-semibold text-slate-200">
                        Execution Policies
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Selected Requests:</span>
                        <span className="text-sky-400 font-mono font-medium">
                          {selectedRequestIds.length} of {requests.length}
                        </span>

                      <div className="space-y-2.5">
                        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={executeTests}
                            onChange={(e) => setExecuteTests(e.target.checked)}
                            disabled={runnerMutation.isPending}
                            className="w-3.5 h-3.5 rounded bg-[#161922] border-[#2e3444] text-sky-500 focus:ring-sky-500/30 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <span className="font-medium text-slate-200">Run saved tests and assertions</span>
                            <p className="text-[11px] text-slate-500">
                              Automatically evaluate saved API tests and assertions against each response
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={stopOnError}
                            onChange={(e) => setStopOnError(e.target.checked)}
                            disabled={runnerMutation.isPending}
                            className="w-3.5 h-3.5 rounded bg-[#161922] border-[#2e3444] text-sky-500 focus:ring-sky-500/30 accent-sky-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div>
                            <span className="font-medium text-slate-200">Stop on error</span>
                            <p className="text-[11px] text-slate-500">
                              Halt remaining execution immediately if any HTTP error, test assertion, or extraction fails
                            </p>
                          </div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Stop on Error:</span>
                        <span className="font-mono text-slate-300">
                          {stopOnError ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results State */}
                {!runnerMutation.isPending && runData && (
                  <div className="p-6">
                    <RunnerResults
                      runData={runData}
                      workspaceId={currentWorkspaceId}
                      collectionId={selectedCollectionId}
                      onRunAgain={handleRun}
                      disabled={runnerMutation.isPending}
                    />
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
