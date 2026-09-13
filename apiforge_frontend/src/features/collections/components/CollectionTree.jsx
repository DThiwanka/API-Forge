import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Layers,
  X,
  Network,
  Play,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';
import CollectionItem from './CollectionItem';
import CreateCollectionDialog from './CreateCollectionDialog';
import LoadingScreen from '../../../components/common/LoadingScreen';
import ErrorState from '../../../components/common/ErrorState';
import { useCollectionsQuery } from '../hooks/useCollections';
import { useWorkspaceQuery } from '../../workspace/hooks/useWorkspace';
import useCollectionStore from '../store/collectionStore';
import { cn } from '../../../utils/cn';

export default function CollectionTree({
  workspaceId,
  activeRequestId,
  className,
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const treeContainerRef = useRef(null);

  const searchQuery = useCollectionStore((s) => s.searchQuery);
  const setSearchQuery = useCollectionStore((s) => s.setSearchQuery);
  const clearSearch = useCollectionStore((s) => s.clearSearch);
  const expandAll = useCollectionStore((s) => s.expandAll);
  const collapseAll = useCollectionStore((s) => s.collapseAll);

  const { data: workspace } = useWorkspaceQuery(workspaceId);
  const isViewer = workspace?.role === 'VIEWER';

  const {
    data: collections = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCollectionsQuery(workspaceId);

  const handleExpandAll = () => {
    const colIds = collections.map((c) => c.id);
    expandAll(colIds);
  };

  const handleCollapseAll = () => {
    const colIds = collections.map((c) => c.id);
    collapseAll(colIds);
  };

  // Keyboard navigation within the tree
  const handleKeyDown = (e) => {
    if (!treeContainerRef.current) return;
    const focusable = Array.from(
      treeContainerRef.current.querySelectorAll('button, a, input')
    ).filter((el) => el.tabIndex !== -1 && !el.disabled);

    const currentIdx = focusable.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = currentIdx < focusable.length - 1 ? currentIdx + 1 : 0;
      focusable[nextIdx]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : focusable.length - 1;
      focusable[prevIdx]?.focus();
    }
  };

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

          <div className="flex items-center gap-0.5">
            {/* Expand / Collapse All */}
            {collections.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#181b22] transition-colors cursor-pointer"
                  title="Expand All"
                  aria-label="Expand All"
                >
                  <ChevronsDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#181b22] transition-colors cursor-pointer"
                  title="Collapse All"
                  aria-label="Collapse All"
                >
                  <ChevronsUp size={13} />
                </button>
              </>
            )}

            <Link
              to={`/workspace/${workspaceId}/runner`}
              className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-[#181b22] transition-colors"
              title="Collection Runner"
              aria-label="Collection Runner"
            >
              <Play size={13} />
            </Link>

            <Link
              to={`/workspace/${workspaceId}/canvas`}
              className="p-1 rounded text-slate-400 hover:text-sky-300 hover:bg-[#181b22] transition-colors"
              title="Open Spatial API Canvas"
              aria-label="Open Spatial API Canvas"
            >
              <Network size={13} />
            </Link>

            {!isViewer && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-medium transition-colors cursor-pointer ml-1"
                title="Create new collection"
                aria-label="Create new collection"
              >
                <Plus size={12} />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Search / Filter Input */}
        <div className="relative flex items-center">
          <Search size={12} className="absolute left-2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter collections, folders, requests..."
            className="w-full h-7 pl-7 pr-7 bg-[#14171f] border border-[#232732] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            aria-label="Filter collections, folders, requests"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 text-slate-500 hover:text-slate-300 cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tree Content with Keyboard Navigation */}
      <div
        ref={treeContainerRef}
        onKeyDown={handleKeyDown}
        role="tree"
        aria-label="API Collections and Requests"
        className="flex-1 overflow-y-auto p-2 space-y-0.5 focus:outline-none"
        tabIndex={0}
      >
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
            {!isViewer && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={12} />
                <span>Create Collection</span>
              </button>
            )}
          </div>
        )}

        {!isLoading &&
          !isError &&
          collections.map((col) => (
            <CollectionItem
              key={col.id}
              collection={col}
              workspaceId={workspaceId}
              activeRequestId={activeRequestId}
              isViewer={isViewer}
              searchQuery={searchQuery}
            />
          ))}

        {/* Clear Search helper if query active */}
        {!isLoading && !isError && searchQuery && collections.length > 0 && (
          <div className="pt-4 pb-2 text-center text-[11px] text-slate-500">
            <button
              type="button"
              onClick={clearSearch}
              className="text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              Clear filter &quot;{searchQuery}&quot;
            </button>
          </div>
        )}
      </div>

      <CreateCollectionDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspaceId}
      />
    </aside>
  );
}

