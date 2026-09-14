import { useNavigate } from 'react-router-dom';
import { Plus, FolderPlus, Network, Terminal, FileCode2, Play } from 'lucide-react';

export default function WorkspaceQuickActions({
  workspaceId,
  isViewer = false,
  onNewRequest,
  onNewCollection,
  onImportCurl,
  onImportOpenApi,
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-2 flex-wrap pt-4">
      {/* Primary Actions */}
      {!isViewer && (
        <button
          type="button"
          onClick={onNewRequest}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        >
          <Plus size={14} />
          <span>New Request</span>
        </button>
      )}

      {!isViewer && (
        <button
          type="button"
          onClick={onNewCollection}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] hover:border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50"
        >
          <FolderPlus size={13} className="text-sky-400" />
          <span>New Collection</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => navigate(`/workspace/${workspaceId}/canvas`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] hover:border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50"
      >
        <Network size={13} className="text-purple-400" />
        <span>Open Canvas</span>
      </button>

      <button
        type="button"
        onClick={() => navigate(`/workspace/${workspaceId}/runner`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141720] hover:bg-[#1a1e2a] border border-[#262c3b] hover:border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50"
      >
        <Play size={13} className="text-emerald-400" />
        <span>Runner</span>
      </button>

      {/* Secondary Import entry points */}
      {!isViewer && (
        <div className="h-4 w-px bg-[#262c3b] mx-1 hidden sm:block" />
      )}

      {!isViewer && (
        <button
          type="button"
          onClick={onImportCurl}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12141c] hover:bg-[#181c26] border border-[#232732] hover:border-slate-700 text-slate-300 text-xs font-mono transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50"
          title="Import from cURL command"
        >
          <Terminal size={12} className="text-amber-400" />
          <span>cURL</span>
        </button>
      )}

      {!isViewer && (
        <button
          type="button"
          onClick={onImportOpenApi}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#12141c] hover:bg-[#181c26] border border-[#232732] hover:border-slate-700 text-slate-300 text-xs font-mono transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50"
          title="Import from OpenAPI 3.0 / 3.1 specification"
        >
          <FileCode2 size={12} className="text-indigo-400" />
          <span>OpenAPI</span>
        </button>
      )}
    </div>
  );
}

