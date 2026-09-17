import { FolderTree, FileCode, Folder, Globe, Users } from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function WorkspaceSummaryMetrics({
  metrics,
  activeEnvironment,
  memberCount,
  onOpenMembers,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 py-4">
      {/* Collections Metric */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#12141c] border border-[#232732]">
        <div className="w-8 h-8 rounded bg-[#181b25] border border-[#2b3140] flex items-center justify-center text-sky-400 shrink-0">
          <FolderTree size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Collections
          </span>
          <span className="text-base font-bold font-mono text-slate-100">
            {metrics.collectionsCount}
          </span>
        </div>
      </div>

      {/* Requests Metric */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#12141c] border border-[#232732]">
        <div className="w-8 h-8 rounded bg-[#181b25] border border-[#2b3140] flex items-center justify-center text-emerald-400 shrink-0">
          <FileCode size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Requests
          </span>
          <span className="text-base font-bold font-mono text-slate-100">
            {metrics.requestsCount}
          </span>
        </div>
      </div>

      {/* Folders Metric */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#12141c] border border-[#232732]">
        <div className="w-8 h-8 rounded bg-[#181b25] border border-[#2b3140] flex items-center justify-center text-amber-400 shrink-0">
          <Folder size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Folders
          </span>
          <span className="text-base font-bold font-mono text-slate-100">
            {metrics.foldersCount}
          </span>
        </div>
      </div>

      {/* Environments Metric */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#12141c] border border-[#232732]">
        <div className="w-8 h-8 rounded bg-[#181b25] border border-[#2b3140] flex items-center justify-center text-purple-400 shrink-0">
          <Globe size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Environments
          </span>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-base font-bold font-mono text-slate-100">
              {metrics.environmentsCount}
            </span>
            {activeEnvironment && (
              <span className="text-[10px] text-emerald-400 font-mono truncate" title={`Active: ${activeEnvironment.name}`}>
                ({activeEnvironment.name})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Team / Members Metric */}
      <div
        onClick={onOpenMembers}
        role={onOpenMembers ? 'button' : undefined}
        tabIndex={onOpenMembers ? 0 : undefined}
        onKeyDown={
          onOpenMembers
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenMembers();
                }
              }
            : undefined
        }
        className={cn(
          'flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[#12141c] border border-[#232732]',
          onOpenMembers &&
            'cursor-pointer hover:border-sky-500/50 hover:bg-[#151926] transition-all group'
        )}
        title={onOpenMembers ? 'View workspace members and collaboration' : 'Workspace members'}
      >
        <div className="w-8 h-8 rounded bg-[#181b25] border border-[#2b3140] flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 shrink-0">
          <Users size={16} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-slate-300">
            Team
          </span>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-base font-bold font-mono text-slate-100">
              {memberCount !== undefined ? memberCount : '—'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
