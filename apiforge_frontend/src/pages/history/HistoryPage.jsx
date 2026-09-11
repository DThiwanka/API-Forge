import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import CollectionTree from '../../features/collections/components/CollectionTree';
import HistorySearch from '../../features/history/components/HistorySearch';
import HistoryFilters from '../../features/history/components/HistoryFilters';
import HistoryItem from '../../features/history/components/HistoryItem';
import HistoryDetailModal from '../../features/history/components/HistoryDetailModal';
import HistoryPagination from '../../features/history/components/HistoryPagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorState from '../../components/common/ErrorState';
import {
  useHistoryQuery,
  useDeleteHistoryItemMutation,
  useClearHistoryMutation,
} from '../../features/history/hooks/useHistory';
import { getDateGroupLabel } from '../../features/history/utils/historyHelpers';
import { useWorkspaceQuery, useWorkspacesQuery } from '../../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../../features/workspace/store/workspaceStore';
import { History, Trash2, Loader2, Sparkles } from 'lucide-react';

export default function HistoryPage() {
  const { workspaceId: routeWorkspaceId } = useParams();
  const navigate = useNavigate();

  const {
    data: workspaces = [],
    error: workspaceError,
  } = useWorkspacesQuery();

  const currentWorkspaceId =
    routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const { data: workspace } = useWorkspaceQuery(currentWorkspaceId);

  // Filter & Pagination state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [inspectingItem, setInspectingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // Sync workspace to store
  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /workspace/:workspaceId/history without valid id, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}/history`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

  // Compute backend query parameters
  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 20,
    };

    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    if (methodFilter !== 'ALL') {
      params.method = methodFilter;
    }

    if (statusFilter === '2xx') {
      params.success = true;
    } else if (statusFilter === '3xx') {
      params.status = 300;
    } else if (statusFilter === '4xx') {
      params.status = 400;
    } else if (statusFilter === '5xx') {
      params.status = 500;
    }

    return params;
  }, [page, searchQuery, methodFilter, statusFilter]);

  // TanStack Query
  const {
    data: historyData,
    isLoading,
    isError,
    error,
    refetch,
  } = useHistoryQuery(currentWorkspaceId, queryParams);

  const deleteMutation = useDeleteHistoryItemMutation(currentWorkspaceId);
  const clearMutation = useClearHistoryMutation(currentWorkspaceId);

  // Permissions
  const canClear = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const canDelete = workspace?.role !== 'VIEWER';

  // Handlers for filter adjustments (resetting to page 1)
  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleMethodChange = (newMethod) => {
    setMethodFilter(newMethod);
    setPage(1);
  };

  const handleSearchChange = (newSearch) => {
    setSearchQuery(newSearch);
    setPage(1);
  };

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setMethodFilter('ALL');
    setSearchQuery('');
    setPage(1);
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    deleteMutation.mutate(deletingItem.id, {
      onSettled: () => setDeletingItem(null),
    });
  };

  const handleConfirmClear = () => {
    clearMutation.mutate(
      {},
      {
        onSettled: () => {
          setIsClearConfirmOpen(false);
          setPage(1);
        },
      }
    );
  };

  const hasActiveFilters =
    statusFilter !== 'ALL' || methodFilter !== 'ALL' || Boolean(searchQuery.trim());

  const items = useMemo(() => historyData?.history || [], [historyData?.history]);
  const pagination = historyData?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

  // Group items by timeline dates (Today, Yesterday, etc.)
  const groupedHistory = useMemo(() => {
    const groups = {};
    for (const item of items) {
      const label = getDateGroupLabel(item.createdAt);
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    }
    return groups;
  }, [items]);

  // Handle unauthorized or not logged in
  if (workspaceError?.response?.status === 401) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#090a0f] text-slate-400">
          <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <History size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Sign in to access and inspect execution history.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            Sign In to APIForge
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex overflow-hidden bg-[#090a0f]">
        {/* Collapsible Collection Tree Sidebar */}
        {!sidebarCollapsed && currentWorkspaceId && (
          <div className="w-64 border-r border-[#232732] bg-[#0c0e14] shrink-0 overflow-y-auto hidden md:block">
            <CollectionTree workspaceId={currentWorkspaceId} />
          </div>
        )}

        {/* Main History Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0c11]">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-[#101218] border-b border-[#232732] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#181b24] border border-[#2b3140] flex items-center justify-center text-sky-400">
                <History size={15} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-slate-100 tracking-tight">
                    Execution History
                  </h1>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#181b24] border border-[#2b3140] text-slate-400 font-semibold">
                    {pagination.total} {pagination.total === 1 ? 'record' : 'records'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Inspect requests, statuses, response metrics, and error diagnostics
                </p>
              </div>
            </div>

            {/* Clear History Action */}
            {canClear && items.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                disabled={clearMutation.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-800/40 transition-colors disabled:opacity-50 self-start sm:self-auto"
                title="Clear all execution history in this workspace"
              >
                {clearMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                <span>Clear History</span>
              </button>
            )}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="px-4 py-2.5 bg-[#0e1016] border-b border-[#232732] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            <HistorySearch
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full md:max-w-md"
            />

            <HistoryFilters
              statusFilter={statusFilter}
              onStatusChange={handleStatusChange}
              methodFilter={methodFilter}
              onMethodChange={handleMethodChange}
              hasActiveFilters={hasActiveFilters}
              onReset={handleResetFilters}
            />
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Loading State Skeleton */}
            {isLoading && (
              <div className="flex flex-col gap-2.5 animate-pulse max-w-5xl mx-auto">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className="h-14 bg-[#111319] border border-[#1e222c] rounded-lg"
                  />
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && isError && (
              <div className="max-w-md mx-auto mt-12">
                <ErrorState
                  title="Failed to load execution history"
                  message={error?.response?.data?.message || error?.message || 'Server error'}
                  onRetry={() => refetch()}
                />
              </div>
            )}

            {/* Empty States */}
            {!isLoading && !isError && items.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto select-none">
                <div className="w-12 h-12 rounded-xl bg-[#12141c] border border-[#232732] flex items-center justify-center text-slate-500 mb-3 shadow-xl">
                  {hasActiveFilters ? <History size={20} /> : <Sparkles size={20} />}
                </div>

                {hasActiveFilters ? (
                  <>
                    <h3 className="text-sm font-medium text-slate-200 mb-1">
                      No matching executions
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      No history entries match your active search and filter criteria.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-[#1a1d28] hover:bg-[#222736] border border-[#2b3140] text-slate-300 transition-colors"
                    >
                      Reset Filters
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-slate-200 mb-1">
                      No API executions yet
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Run an API request in the Request Workspace and its execution records will appear here.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/workspace/${currentWorkspaceId}`)}
                      className="px-3 py-1.5 rounded text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                    >
                      Go to Request Editor
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Populated Grouped History List */}
            {!isLoading && !isError && items.length > 0 && (
              <div className="flex flex-col gap-6 max-w-5xl mx-auto">
                {Object.entries(groupedHistory).map(([groupLabel, groupItems]) => (
                  <div key={groupLabel} className="flex flex-col gap-2">
                    {/* Timeline section header */}
                    <div className="flex items-center gap-2 select-none">
                      <span className="text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">
                        {groupLabel}
                      </span>
                      <div className="h-px flex-1 bg-[#1a1d26]" />
                    </div>

                    {/* History items */}
                    <div className="flex flex-col gap-1.5">
                      {groupItems.map((item) => (
                        <HistoryItem
                          key={item.id}
                          item={item}
                          onInspect={(it) => setInspectingItem(it)}
                          onDelete={(it) => setDeletingItem(it)}
                          canDelete={canDelete}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Toolbar */}
          {!isLoading && !isError && pagination.totalPages > 1 && (
            <HistoryPagination
              page={pagination.page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <HistoryDetailModal
        isOpen={Boolean(inspectingItem)}
        onClose={() => setInspectingItem(null)}
        item={inspectingItem}
      />

      {/* Delete Item Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Execution Record"
        message={`Are you sure you want to delete the execution record for "${deletingItem?.request?.name || deletingItem?.url || 'this request'}"? This action cannot be undone.`}
      />

      {/* Clear History Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={handleConfirmClear}
        title="Clear Execution History"
        message="Clear execution history? This will permanently remove all execution records for this workspace."
      />
    </AppShell>
  );
}
