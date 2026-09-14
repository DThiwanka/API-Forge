import { FolderTree, FileCode, Folder, Globe } from 'lucide-react';

export default function WorkspaceSummaryMetrics({
  metrics,
  activeEnvironment,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
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
    </div>
  );
}

