import { useState, useMemo } from 'react';
import { Plus, Search, Layers, X } from 'lucide-react';
import CollectionItem from './CollectionItem';
import CreateCollectionDialog from './CreateCollectionDialog';
import LoadingScreen from '../../../components/common/LoadingScreen';
import ErrorState from '../../../components/common/ErrorState';
import { useCollectionsQuery } from '../hooks/useCollections';
import useCollectionStore from '../store/collectionStore';
import { cn } from '../../../utils/cn';

export default function CollectionTree({
  workspaceId,
  activeRequestId,
  className,
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const searchQuery = useCollectionStore((s) => s.searchQuery);
  const setSearchQuery = useCollectionStore((s) => s.setSearchQuery);

  const {
    data: collections = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCollectionsQuery(workspaceId);

  // Filter collections if search query provided
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const lower = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        (c.description && c.description.toLowerCase().includes(lower))
    );
  }, [collections, searchQuery]);

  return (
    <aside
      className={cn(
        'w-64 h-full bg-[#111318] border-r border-[#232732] flex flex-col flex-shrink-0 select-none overflow-hidden',
        className
      )}
    >
      {/* Top Header */}
      <div className="p-3 border-b border-[#232732] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Layers size={14} className="text-sky-400" />
            <span>Collections</span>
            {collections.length > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181b22] text-slate-400 border border-[#232732]">
                {collections.length}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors"
            title="Create new collection"
          >
            <Plus size={12} />
            <span>New</span>
          </button>
        </div>

        {/* Quick Filter Input */}
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter collections..."
            className="w-full h-7 pl-7 pr-7 bg-[#14171f] border border-[#232732] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading && (
          <LoadingScreen message="Loading collections..." />
        )}

        {isError && (
          <ErrorState
            title="Failed to load collections"
            message={error?.message || 'Could not retrieve collections for this workspace.'}
            onRetry={refetch}
          />
        )}

        {!isLoading && !isError && collections.length === 0 && (
          <div className="py-12 px-4 text-center text-slate-500 flex flex-col items-center justify-center">
            <Layers size={28} className="mb-2 opacity-30 text-slate-400" />
            <div className="text-xs font-medium text-slate-300 mb-1">
              No collections yet
            </div>
            <p className="text-[11px] text-slate-500 mb-4 max-w-[180px]">
              Create your first API collection to start building your workspace.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5"
            >
              <Plus size={12} />
              <span>Create Collection</span>
            </button>
          </div>
        )}

        {!isLoading && !isError && collections.length > 0 && filteredCollections.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-xs">
            No collections matching "{searchQuery}"
          </div>
        )}

        {!isLoading &&
          !isError &&
          filteredCollections.map((col) => (
            <CollectionItem
              key={col.id}
              collection={col}
              workspaceId={workspaceId}
              activeRequestId={activeRequestId}
            />
          ))}
      </div>

      <CreateCollectionDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspaceId}
      />
    </aside>
  );
}

