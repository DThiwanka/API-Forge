import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import CollectionTree from '../features/collections/components/CollectionTree';
import RequestWorkspace from '../features/requests/components/RequestWorkspace';
import { useWorkspacesQuery, useCollectionsQuery } from '../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../features/workspace/store/workspaceStore';
import { Layers, Terminal, Loader2, ArrowRight, MousePointerClick } from 'lucide-react';

export default function Workspace() {
  const { workspaceId: routeWorkspaceId, collectionId, requestId } = useParams();
  const navigate = useNavigate();

  const {
    data: workspaces = [],
    isLoading: loadingWorkspaces,
    error: workspaceError,
  } = useWorkspacesQuery();

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const currentWorkspaceId = routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  const { data: collections = [] } = useCollectionsQuery(currentWorkspaceId);

  // Sync active workspace ID to store
  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /workspace with no workspaceId in route, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

  // Handle unauthorized or not logged in
  if (workspaceError?.response?.status === 401) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[#090a0f]">
          <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Terminal size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            You must be signed in to access APIForge workspaces and execute requests.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            <span>Sign In to APIForge</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Collection Navigation Tree Sidebar */}
        {!sidebarCollapsed && currentWorkspaceId && (
          <CollectionTree
            workspaceId={currentWorkspaceId}
            activeRequestId={requestId}
          />
        )}

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0d0f14]">
          {loadingWorkspaces ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
              <span className="text-xs font-mono">Loading workspace...</span>
            </div>
          ) : requestId ? (
            <RequestWorkspace
              workspaceId={currentWorkspaceId}
              collectionId={collectionId}
              requestId={requestId}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[radial-gradient(#1a1d26_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-sky-400 mb-4 shadow-xl">
                {collections.length > 0 ? (
                  <MousePointerClick size={22} />
                ) : (
                  <Layers size={22} />
                )}
              </div>

              {collections.length > 0 ? (
                <>
                  <h2 className="text-base font-semibold text-slate-100 mb-1">
                    Select a Request
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                    Choose a request from the collection tree on the left to inspect, configure, and execute it.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-slate-100 mb-1">
                    No Collections Yet
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                    Create your first collection in the sidebar to begin organizing folders and API requests.
                  </p>
                </>
              )}

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#111318] border border-[#232732] text-[11px] text-slate-400 font-mono">
                <Terminal size={12} className="text-sky-400" />
                <span>APIForge Shell Active • Hierarchical Navigation Online</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
