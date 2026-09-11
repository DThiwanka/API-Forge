import { Layers, PanelLeftClose, PanelLeft, Globe } from 'lucide-react';
import { useWorkspaceQuery, useCollectionsQuery } from '../../features/workspace/hooks/useWorkspace';
import { useEnvironmentsQuery } from '../../features/environments/hooks/useEnvironments';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { cn } from '../../utils/cn';

const ROLE_BADGES = {
  OWNER: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
  ADMIN: 'text-sky-400 bg-sky-950/40 border-sky-800/50',
  MEMBER: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
  VIEWER: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
};

export default function WorkspaceHeader({ workspaceId, className }) {
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useWorkspaceStore((s) => s.toggleSidebar);

  const { data: workspace } = useWorkspaceQuery(workspaceId);
  const { data: collections = [] } = useCollectionsQuery(workspaceId);
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);

  const activeEnv = environments.find((e) => e.isActive);
  const roleBadge = ROLE_BADGES[workspace?.role] || ROLE_BADGES.VIEWER;

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
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <Globe size={12} className={activeEnv ? 'text-sky-400' : 'text-slate-500'} />
          <span className="text-slate-400">
            Env: <span className="text-slate-200">{activeEnv ? activeEnv.name : 'None'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

