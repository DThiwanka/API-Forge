import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Layers, PanelLeftClose, PanelLeft, Globe, Network, ListTree, History, Compass, Download, Upload, Users } from 'lucide-react';
import { useWorkspaceQuery, useCollectionsQuery } from '../../features/workspace/hooks/useWorkspace';
import { useEnvironmentsQuery } from '../../features/environments/hooks/useEnvironments';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import ImportDialog from '../../features/import-export/components/ImportDialog';
import ExportDialog from '../../features/import-export/components/ExportDialog';
import WorkspaceMembersModal from '../../features/collaboration/components/WorkspaceMembersModal';
import useRealtimeCollaboration from '../../features/collaboration/hooks/useRealtimeCollaboration';
import WorkspacePresenceIndicator from '../../features/collaboration/components/WorkspacePresenceIndicator';
import { cn } from '../../utils/cn';

const ROLE_BADGES = {
  OWNER: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
  ADMIN: 'text-sky-400 bg-sky-950/40 border-sky-800/50',
  MEMBER: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  VIEWER: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
};

export default function WorkspaceHeader({ workspaceId, className }) {
  const location = useLocation();
  const isCanvas = location.pathname.endsWith('/canvas');
  const isBrowser = location.pathname.includes('/browser');
  const isEnvironments = location.pathname.includes('/environments');
  const isHistory = location.pathname.includes('/history');
  const isEditor = !isCanvas && !isEnvironments && !isHistory && !isBrowser;

  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const { data: workspace } = useWorkspaceQuery(workspaceId);
  const { data: collections = [] } = useCollectionsQuery(workspaceId);
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);

  // Real-time collaboration hook
  useRealtimeCollaboration(workspaceId);

  // Global listeners for command center collaboration shortcuts
  useEffect(() => {
    const handleOpenMembers = () => setIsMembersOpen(true);
    window.addEventListener('apiforge:open-members-modal', handleOpenMembers);
    window.addEventListener('apiforge:open-invite-dialog', handleOpenMembers);
    return () => {
      window.removeEventListener('apiforge:open-members-modal', handleOpenMembers);
      window.removeEventListener('apiforge:open-invite-dialog', handleOpenMembers);
    };
  }, []);

  const activeEnv = environments.find((e) => e.isActive);
  const roleBadge = ROLE_BADGES[workspace?.role] || ROLE_BADGES.VIEWER;
  const canWrite = workspace?.role && ['OWNER', 'ADMIN', 'MEMBER'].includes(workspace.role);

  if (!workspaceId) return null;

  return (
    <div
      className={cn(
        'h-9 bg-[#111318] border-b border-[#232732] px-3 flex items-center justify-between select-none text-xs',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#181b22] transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
        >
          {sidebarCollapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>

        <div className="flex items-center gap-2">
          <Layers size={13} className="text-slate-500" />
          <span className="font-semibold text-slate-200 truncate max-w-[200px]">
            {workspace?.name || 'Workspace'}
          </span>

          {workspace?.role && (
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[10px] font-mono border font-semibold uppercase',
                roleBadge
              )}
            >
              {workspace.role}
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-[#232732]" />

        <div className="text-[11px] text-slate-500 font-mono">
          {collections.length} {collections.length === 1 ? 'Collection' : 'Collections'}
        </div>

        <div className="h-3 w-px bg-[#232732]" />

        {/* View Mode Switcher: Editor vs Canvas vs Environments */}
        <nav
          aria-label="Workspace views"
          className="flex items-center p-0.5 rounded-md bg-[#0d0f14] border border-[#232732]"
        >
          <Link
            to={`/workspace/${workspaceId}`}
            aria-current={isEditor ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              isEditor
                ? 'bg-[#181b22] text-sky-400 border border-[#2b313e] shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            )}
            title="Request Workspace & Hierarchical Tree"
          >
            <ListTree size={12} />
            <span>Editor</span>
          </Link>

          <Link
            to={`/workspace/${workspaceId}/canvas`}
            aria-current={isCanvas ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              isCanvas
                ? 'bg-[#181b22] text-sky-400 border border-[#2b313e] shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            )}
            title="Spatial API Canvas"
          >
            <Network size={12} />
            <span>Canvas</span>
          </Link>

          <Link
            to={`/workspace/${workspaceId}/browser`}
            aria-current={isBrowser ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              isBrowser
                ? 'bg-[#181b22] text-sky-400 border border-[#2b313e] shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            )}
            title="Integrated Developer Browser Space"
          >
            <Compass size={12} />
            <span>Browser</span>
          </Link>

          <Link
            to={`/workspace/${workspaceId}/environments`}
            aria-current={isEnvironments ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              isEnvironments
                ? 'bg-[#181b22] text-sky-400 border border-[#2b313e] shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            )}
            title="Environment & Variable Management"
          >
            <Globe size={12} />
            <span>Environments</span>
          </Link>

          <Link
            to={`/workspace/${workspaceId}/history`}
            aria-current={isHistory ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              isHistory
                ? 'bg-[#181b22] text-sky-400 border border-[#2b313e] shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            )}
            title="API Execution History"
          >
            <History size={12} />
            <span>History</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-mono">
        <WorkspacePresenceIndicator onOpenMembers={() => setIsMembersOpen(true)} />

        <button
          type="button"
          onClick={() => setIsMembersOpen(true)}
          aria-haspopup="dialog"
          aria-label="Manage workspace members and invitations"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          title="Manage workspace members and invitations"
        >
          <Users size={12} />
          <span>Members</span>
        </button>

        {canWrite && (
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            aria-haspopup="dialog"
            aria-label="Import API requests"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors cursor-pointer"
            title="Import API requests"
          >
            <Download size={12} />
            <span>Import</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsExportOpen(true)}
          aria-haspopup="dialog"
          aria-label="Export collection"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          title="Export collection as OpenAPI specification"
        >
          <Upload size={12} />
          <span>Export</span>
        </button>

        <Link
          to={`/workspace/${workspaceId}/environments`}
          className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
          title="Configure environment variables"
        >
          <Globe size={12} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
          <span className="text-slate-400">
            Env: <span className="text-slate-200">{activeEnv ? activeEnv.name : 'None'}</span>
          </span>
        </Link>
      </div>

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        workspaceId={workspaceId}
      />

      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        workspaceId={workspaceId}
        initialTab="openapi"
      />

      <WorkspaceMembersModal
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        workspaceId={workspaceId}
        workspaceRole={workspace?.role || 'MEMBER'}
      />
    </div>
  );
}

