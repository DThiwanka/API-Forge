import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import WorkspaceSidebar from '../features/workspace/components/WorkspaceSidebar';
import RequestWorkspace from '../features/requests/components/RequestWorkspace';
import { useWorkspacesQuery } from '../features/workspace/hooks/useWorkspace';
import { Layers, Terminal, Loader2, ArrowRight } from 'lucide-react';

export default function Workspace() {
  const { workspaceId: routeWorkspaceId, collectionId, requestId } = useParams();
  const navigate = useNavigate();

  const { data: workspaces = [], isLoading: loadingWorkspaces, error: workspaceError } = useWorkspacesQuery();

  const currentWorkspaceId = routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  // If on /workspace with no workspaceId in route, but workspaces are loaded, redirect to /workspace/:workspaceId
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
    <AppShell>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Workspace Navigation Sidebar */}
        <WorkspaceSidebar workspaceId={currentWorkspaceId} />

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
                <Layers size={22} />
              </div>
              <h2 className="text-base font-semibold text-slate-100 mb-1">
                APIForge Request Workspace
              </h2>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Select an existing request from the sidebar or click <span className="text-sky-400 font-medium">+</span> next to a collection to configure and execute HTTP requests.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#111318] border border-[#232732] text-[11px] text-slate-400 font-mono">
                <Terminal size={12} className="text-sky-400" />
                <span>Request Engine Online • SSRF Guarded • Environment Intercept Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
