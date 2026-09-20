import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, FileCode2, Network, Play, Globe, History, AlertCircle, Users } from 'lucide-react';
import { useWorkspaceQuery, useCollectionsQuery } from '../../features/workspace/hooks/useWorkspace';
import { useEnvironmentsQuery } from '../../features/environments/hooks/useEnvironments';
import { useHistoryQuery } from '../../features/history/hooks/useHistory';
import { useMembersQuery } from '../../features/collaboration/hooks/useCollaboration';
import { computeWorkspaceMetrics, formatLastActivity } from '../../features/workspace/utils/workspaceDashboardUtils';

import WorkspaceHeaderSection from '../../features/workspace/components/WorkspaceHeaderSection';
import WorkspaceQuickActions from '../../features/workspace/components/WorkspaceQuickActions';
import WorkspaceSummaryMetrics from '../../features/workspace/components/WorkspaceSummaryMetrics';
import WorkspaceCollectionsList from '../../features/workspace/components/WorkspaceCollectionsList';
import WorkspaceRecentRequests from '../../features/workspace/components/WorkspaceRecentRequests';
import WorkspaceRecentActivity from '../../features/workspace/components/WorkspaceRecentActivity';
import WorkspaceEnvironmentsList from '../../features/workspace/components/WorkspaceEnvironmentsList';
import WorkspaceCanvasCard from '../../features/workspace/components/WorkspaceCanvasCard';

import CreateRequestDialog from '../../features/collections/components/CreateRequestDialog';
import CreateCollectionDialog from '../../features/collections/components/CreateCollectionDialog';
import ImportDialog from '../../features/import-export/components/ImportDialog';
import WorkspaceMembersModal from '../../features/collaboration/components/WorkspaceMembersModal';
import FirstWorkspaceOnboarding from '../../features/workspace/components/FirstWorkspaceOnboarding';
import { toast } from '../../stores/toastStore';

export default function WorkspaceHome({ workspaceId, onNewRequest: propOnNewRequest }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Local dialog states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewCollectionOpen, setIsNewCollectionOpen] = useState(false);
  const [pendingCreateRequest, setPendingCreateRequest] = useState(false);
  const [collectionModalSubtitle, setCollectionModalSubtitle] = useState(null);
  const [importModal, setImportModal] = useState({ isOpen: false, tab: 'curl' });
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

  // Workspace queries
  const {
    data: workspace,
    isLoading: loadingWorkspace,
    isError: workspaceError,
  } = useWorkspaceQuery(workspaceId);

  const { data: collections = [], isLoading: loadingCollections } = useCollectionsQuery(workspaceId);
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);
  const { data: historyData } = useHistoryQuery(workspaceId, { limit: 5 });
  const { data: members = [] } = useMembersQuery(workspaceId);

  const isViewer = workspace?.role === 'VIEWER';

  // Compute metrics from cached data
  const metrics = useMemo(() => {
    return computeWorkspaceMetrics(queryClient, workspaceId, collections, environments);
  }, [queryClient, workspaceId, collections, environments]);

  // Derived state
  const lastActivity = useMemo(() => {
    return formatLastActivity(historyData?.history, workspace);
  }, [historyData, workspace]);

  const activeEnvironment = useMemo(() => {
    return environments.find((env) => env.isActive);
  }, [environments]);

  const handleOpenNewRequest = () => {
    if (collections.length === 0) {
      toast.info('Please create a collection first to organize your requests');
      setCollectionModalSubtitle('Requests belong to collections. Create your first collection to hold this request.');
      setPendingCreateRequest(true);
      setIsNewCollectionOpen(true);
      return;
    }
    if (propOnNewRequest) {
      propOnNewRequest();
    } else {
      setIsNewRequestOpen(true);
    }
  };

  if (!workspaceId) {
    return <FirstWorkspaceOnboarding />;
  }

  if (loadingWorkspace && !workspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-mono">Loading workspace dashboard...</span>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 mb-3">
          <AlertCircle size={22} />
        </div>
        <h2 className="text-sm font-semibold text-slate-200 mb-1">Failed to load workspace</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          There was an issue fetching the workspace details. Please check your connection or switch workspaces.
        </p>
      </div>
    );
  }

  // Pure empty workspace check (no collections and no requests)
  const isWorkspaceEmpty = collections.length === 0 && metrics.requestsCount === 0;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f15] text-slate-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* 1. Header Section */}
        <WorkspaceHeaderSection workspace={workspace} lastActivity={lastActivity} />

        {isWorkspaceEmpty && !loadingCollections ? (
          /* Empty Workspace Onboarding State */
          <div className="py-12 px-6 rounded-2xl bg-[#11131a] border border-[#232732] text-center flex flex-col items-center justify-center shadow-lg relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-[#171a25] border border-[#2c3345] flex items-center justify-center text-sky-400 mb-4 shadow-xl">
              <Layers size={28} />
            </div>

            <h2 className="text-lg font-bold text-slate-100 mb-2">Create your first collection</h2>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Requests in APIForge are organized inside collections. Start by creating your first collection to group, configure, and test your API endpoints.
            </p>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              {!isViewer && (
                <button
                  type="button"
                  onClick={() => setIsNewCollectionOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Collection</span>
                </button>
              )}

              {!isViewer && (
                <button
                  type="button"
                  onClick={handleOpenNewRequest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181c28] hover:bg-[#202536] border border-[#2d3447] text-slate-200 text-xs font-medium shadow-sm transition-all cursor-pointer"
                >
                  <Plus size={14} className="text-sky-400" />
                  <span>Create Request</span>
                </button>
              )}

              {!isViewer && (
                <button
                  type="button"
                  onClick={() => setImportModal({ isOpen: true, tab: 'openapi' })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181c28] hover:bg-[#202536] border border-[#2d3447] text-slate-200 text-xs font-medium shadow-sm transition-all cursor-pointer"
                >
                  <FileCode2 size={14} className="text-indigo-400" />
                  <span>Import OpenAPI</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(`/workspace/${workspaceId}/canvas`)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#181c28] hover:bg-[#202536] border border-[#2d3447] text-slate-200 text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <Network size={14} className="text-purple-400" />
                <span>Open Canvas</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Populated / Partial Dashboard */
          <>
            {/* 2. Quick Actions */}
            <WorkspaceQuickActions
              workspaceId={workspaceId}
              isViewer={isViewer}
              onNewRequest={handleOpenNewRequest}
              onNewCollection={() => setIsNewCollectionOpen(true)}
              onImportCurl={() => setImportModal({ isOpen: true, tab: 'curl' })}
              onImportOpenApi={() => setImportModal({ isOpen: true, tab: 'openapi' })}
            />

            {/* 3. Summary Metrics Strip */}
            <WorkspaceSummaryMetrics
              metrics={metrics}
              activeEnvironment={activeEnvironment}
              memberCount={members.length}
              onOpenMembers={() => setIsMembersModalOpen(true)}
            />

            {/* 4. Two Column Operational Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column (7 cols): Collections & Recent Requests */}
              <div className="lg:col-span-7 space-y-6">
                <WorkspaceCollectionsList
                  workspaceId={workspaceId}
                  collections={collections}
                  isViewer={isViewer}
                  onNewCollection={() => setIsNewCollectionOpen(true)}
                />

                <WorkspaceRecentRequests workspaceId={workspaceId} />
              </div>

              {/* Right Column (5 cols): Activity, Environments & Canvas */}
              <div className="lg:col-span-5 space-y-6">
                <WorkspaceRecentActivity workspaceId={workspaceId} />

                <WorkspaceEnvironmentsList workspaceId={workspaceId} isViewer={isViewer} />

                <WorkspaceCanvasCard workspaceId={workspaceId} />
              </div>
            </div>

            {/* 5. Navigation Shortcuts Footer */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t border-[#1e222d] text-xs text-slate-400 flex-wrap">
              <span className="font-mono text-[11px] text-slate-400">
                Workspace Shortcuts
              </span>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsMembersModalOpen(true)}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} className="text-sky-400" />
                  <span>Team ({members.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/${workspaceId}/canvas`)}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Network size={13} className="text-purple-400" />
                  <span>API Canvas</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/${workspaceId}/runner`)}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Play size={13} className="text-emerald-400" />
                  <span>Collection Runner</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/${workspaceId}/environments`)}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Globe size={13} className="text-purple-400" />
                  <span>Environments</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/workspace/${workspaceId}/history`)}
                  className="hover:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <History size={13} className="text-amber-400" />
                  <span>History</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <CreateRequestDialog
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        workspaceId={workspaceId}
        onOpenCreateCollection={() => {
          setIsNewRequestOpen(false);
          setIsNewCollectionOpen(true);
        }}
      />

      <CreateCollectionDialog
        isOpen={isNewCollectionOpen}
        onClose={() => {
          setIsNewCollectionOpen(false);
          setPendingCreateRequest(false);
          setCollectionModalSubtitle(null);
        }}
        workspaceId={workspaceId}
        subtitle={collectionModalSubtitle}
        onSuccess={(created) => {
          if (pendingCreateRequest) {
            setPendingCreateRequest(false);
            setCollectionModalSubtitle(null);
            setIsNewRequestOpen(true);
          }
        }}
      />

      <ImportDialog
        isOpen={importModal.isOpen}
        onClose={() => setImportModal({ isOpen: false, tab: 'curl' })}
        workspaceId={workspaceId}
        initialTab={importModal.tab}
      />

      <WorkspaceMembersModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        workspaceId={workspaceId}
        workspaceRole={workspace?.role || 'MEMBER'}
      />
    </div>
  );
}
