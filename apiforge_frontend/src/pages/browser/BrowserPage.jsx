import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import CollectionTree from '../../features/collections/components/CollectionTree';
import BrowserSpace from '../../features/browser/components/BrowserSpace';
import { useWorkspacesQuery } from '../../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { Terminal, ArrowRight } from 'lucide-react';

export default function BrowserPage() {
  const { workspaceId: routeWorkspaceId } = useParams();
  const navigate = useNavigate();

  const {
    data: workspaces = [],
    error: workspaceError,
  } = useWorkspacesQuery();

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const currentWorkspaceId =
    routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /browser without valid workspace id in route, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}/browser`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

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
            You must be signed in to access the APIForge Browser Space.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors cursor-pointer"
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
      <div className="flex-1 flex overflow-hidden h-full">
        {!sidebarCollapsed && currentWorkspaceId && (
          <div className="w-64 border-r border-[#232732] bg-[#0d0f14] flex flex-col shrink-0">
            <CollectionTree workspaceId={currentWorkspaceId} />
          </div>
        )}
        {currentWorkspaceId && <BrowserSpace workspaceId={currentWorkspaceId} />}
      </div>
    </AppShell>
  );
}

