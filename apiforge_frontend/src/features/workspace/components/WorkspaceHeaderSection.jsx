import { Search, Layers, Clock } from 'lucide-react';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { useCommandCenterStore } from '../../command-center/store/commandCenterStore';

const ROLE_BADGES = {
  OWNER: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  ADMIN: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
  MEMBER: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  VIEWER: 'text-slate-400 bg-slate-800/40 border-slate-700/40',
};

export default function WorkspaceHeaderSection({ workspace, lastActivity }) {
  const openCommandCenter = useCommandCenterStore((s) => s.open);

  const role = workspace?.role || 'MEMBER';
  const roleClass = ROLE_BADGES[role] || ROLE_BADGES.MEMBER;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#232732]">
      {/* Left side: Avatar + Workspace Name + Description + Role */}
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-[#141720] border border-[#262c3b] flex items-center justify-center text-sky-400 shadow-sm shrink-0">
          <Layers size={20} />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-100 tracking-tight truncate">
              {workspace?.name || 'Workspace Overview'}
            </h1>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${roleClass}`}
            >
              {role}
            </span>

            {lastActivity && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded bg-[#151821] border border-[#232732]">
                <Clock size={11} className="text-slate-500" />
                <span>Active {lastActivity}</span>
              </span>
            )}
          </div>

          {workspace?.description && (
            <p className="text-xs text-slate-400 mt-1 max-w-2xl line-clamp-2 leading-relaxed">
              {workspace.description}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Command Center trigger & Workspace Switcher */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={openCommandCenter}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer shadow-sm group focus:outline-none focus:ring-1 focus:ring-sky-500/50"
          title="Open Command Center (Ctrl+K / Cmd+K)"
        >
          <Search size={13} className="text-slate-500 group-hover:text-sky-400 transition-colors" />
          <span className="font-medium">Search workspace...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[#1b202c] border border-[#2e3547] rounded text-slate-400 group-hover:text-slate-300">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>

        <WorkspaceSwitcher currentWorkspaceId={workspace?.id} />
      </div>
    </div>
  );
}

