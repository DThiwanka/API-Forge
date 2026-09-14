import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FolderTree, Folder, Play, Plus, ChevronRight, Layers } from 'lucide-react';
import useCollectionStore from '../../collections/store/collectionStore';

export default function WorkspaceCollectionsList({
  workspaceId,
  collections = [],
  isViewer = false,
  onNewCollection,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const expandCollection = useCollectionStore((s) => s.expandCollection);

  const getCollectionCounts = (colId) => {
    const cachedRequests = queryClient.getQueryData(['requests', workspaceId, colId]) || [];
    const cachedFolders = queryClient.getQueryData(['folders', workspaceId, colId]) || [];
    return {
      requestCount: Array.isArray(cachedRequests) ? cachedRequests.length : 0,
      folderCount: Array.isArray(cachedFolders) ? cachedFolders.length : 0,
    };
  };

  const handleOpenCollection = (collection) => {
    expandCollection(collection.id);
    const cachedRequests = queryClient.getQueryData(['requests', workspaceId, collection.id]) || [];
    if (Array.isArray(cachedRequests) && cachedRequests.length > 0) {
      const firstReq = cachedRequests[0];
      navigate(
        `/workspace/${workspaceId}/collections/${collection.id}/requests/${firstReq.id}`
      );
    }
  };

  return (
    <div className="flex flex-col bg-[#11131a] border border-[#232732] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f232e] bg-[#141721]">
        <div className="flex items-center gap-2">
          <FolderTree size={15} className="text-sky-400" />
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Collections
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1c202d] text-slate-400 border border-[#2a3040]">
            {collections.length}
          </span>
        </div>

        {!isViewer && (
          <button
            type="button"
            onClick={onNewCollection}
            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
        )}
      </div>

      {/* Body / List */}
      <div className="divide-y divide-[#1b1f29] min-h-[140px] flex flex-col justify-center">
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Layers size={22} className="text-slate-600 mb-2" />
            <span className="text-xs font-medium text-slate-300">No collections yet</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
              Organize your endpoints, folders, and tests into structured collections.
            </p>
            {!isViewer && (
              <button
                type="button"
                onClick={onNewCollection}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 border border-sky-500/30 text-xs font-medium transition-all cursor-pointer"
              >
                <Plus size={12} />
                <span>Create Collection</span>
              </button>
            )}
          </div>
        ) : (
          collections.map((col) => {
            const { requestCount, folderCount } = getCollectionCounts(col.id);

            return (
              <div
                key={col.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#151924] transition-colors group cursor-pointer"
                onClick={() => handleOpenCollection(col)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded bg-[#181c28] border border-[#282f42] flex items-center justify-center text-sky-400 shrink-0">
                    <Folder size={14} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-slate-200 truncate group-hover:text-sky-300 transition-colors">
                      {col.name}
                    </span>
                    {col.description ? (
                      <span className="text-[11px] text-slate-400 truncate max-w-md">
                        {col.description}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{requestCount} requests</span>
                        {folderCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{folderCount} folders</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#161a26] border border-[#242a3a]">
                    {requestCount} req
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/workspace/${workspaceId}/runner`);
                    }}
                    className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/30 transition-colors"
                    title="Run collection"
                  >
                    <Play size={13} />
                  </button>

                  <ChevronRight
                    size={14}
                    className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

