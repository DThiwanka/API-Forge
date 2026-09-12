import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import CollectionTree from '../features/collections/components/CollectionTree';
import RequestWorkspace from '../features/requests/components/RequestWorkspace';
import RequestTabBar from '../features/requests/components/RequestTabBar';
import UnsavedTabDialog from '../features/requests/components/UnsavedTabDialog';
import CreateRequestDialog from '../features/collections/components/CreateRequestDialog';
import { useWorkspacesQuery, useCollectionsQuery } from '../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../features/workspace/store/workspaceStore';
import useRequestTabStore from '../features/requests/store/requestTabStore';
import useRequestStore from '../features/requests/store/requestStore';
import { Layers, Terminal, Loader2, ArrowRight, MousePointerClick, Plus } from 'lucide-react';

export default function Workspace() {
  const { workspaceId: routeWorkspaceId, collectionId, requestId } = useParams();
  const navigate = useNavigate();

  const [confirmCloseTab, setConfirmCloseTab] = useState(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const {
    data: workspaces = [],
    isLoading: loadingWorkspaces,
    error: workspaceError,
  } = useWorkspacesQuery();

  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const sidebarCollapsed = useWorkspaceStore((s) => s.sidebarCollapsed);

  const currentWorkspaceId = routeWorkspaceId || (workspaces.length > 0 ? workspaces[0].id : null);

  const { data: collections = [] } = useCollectionsQuery(currentWorkspaceId);

  // Tab Store
  const tabs = useRequestTabStore((s) => s.tabsByWorkspace[currentWorkspaceId] || []);
  const activeTabId = useRequestTabStore((s) => s.activeTabByWorkspace[currentWorkspaceId] || null);
  const openTab = useRequestTabStore((s) => s.openTab);
  const closeTab = useRequestTabStore((s) => s.closeTab);
  const closeOtherTabs = useRequestTabStore((s) => s.closeOtherTabs);
  const closeTabsToRight = useRequestTabStore((s) => s.closeTabsToRight);

  // Sync active workspace ID to store
  useEffect(() => {
    if (currentWorkspaceId) {
      setActiveWorkspaceId(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setActiveWorkspaceId]);

  // If on /workspace with no workspaceId in route, redirect to first workspace
  useEffect(() => {
    if (!routeWorkspaceId && workspaces.length > 0) {
      navigate(`/workspace/${workspaces[0].id}`, { replace: true });
    }
  }, [routeWorkspaceId, workspaces, navigate]);

  // Automatically register and activate tab when navigating to a request route
  useEffect(() => {
    if (currentWorkspaceId && requestId) {
      openTab({
        workspaceId: currentWorkspaceId,
        collectionId,
        requestId,
      });
    }
  }, [currentWorkspaceId, collectionId, requestId, openTab]);

  // Tab Selection
  const handleSelectTab = useCallback(
    (targetRequestId) => {
      if (targetRequestId === requestId) return;
      const targetTab = tabs.find((t) => t.requestId === targetRequestId);
      if (targetTab) {
        navigate(
          `/workspace/${currentWorkspaceId}/collections/${targetTab.collectionId}/requests/${targetTab.requestId}`
        );
      }
    },
    [tabs, requestId, currentWorkspaceId, navigate]
  );

  // Execute tab closing after checks
  const executeCloseTab = useCallback(
    (targetTab) => {
      if (!targetTab) return;
      const reqStore = useRequestStore.getState();

      // Clear draft if closing
      reqStore.clearDraft(targetTab.requestId);

      const { nextTab } = closeTab(currentWorkspaceId, targetTab.requestId);

      // If we closed the active tab, navigate to the next tab or workspace home
      if (targetTab.requestId === requestId) {
        if (nextTab) {
          navigate(
            `/workspace/${currentWorkspaceId}/collections/${nextTab.collectionId}/requests/${nextTab.requestId}`
          );
        } else {
          navigate(`/workspace/${currentWorkspaceId}`);
        }
      }
    },
    [currentWorkspaceId, requestId, closeTab, navigate]
  );

  // Tab Close handler with dirty check
  const handleRequestCloseTab = useCallback(
    (targetRequestId) => {
      const targetTab = tabs.find((t) => t.requestId === targetRequestId);
      if (!targetTab) return;

      const reqStore = useRequestStore.getState();
      const isCurrentlyActive = reqStore.id === targetRequestId;
      const isDirty = targetTab.isDirty || (isCurrentlyActive && reqStore.isDirty);

      if (isDirty) {
        setConfirmCloseTab(targetTab);
      } else {
        executeCloseTab(targetTab);
      }
    },
    [tabs, executeCloseTab]
  );

  // Close other tabs
  const handleCloseOtherTabs = useCallback(
    (targetRequestId) => {
      const otherTabs = tabs.filter((t) => t.requestId !== targetRequestId);
      const hasDirty = otherTabs.some((t) => t.isDirty);

      if (hasDirty) {
        const dirtyTab = otherTabs.find((t) => t.isDirty);
        setConfirmCloseTab({
          ...dirtyTab,
          title: 'other tabs with unsaved changes',
          onConfirmAll: () => {
            closeOtherTabs(currentWorkspaceId, targetRequestId);
            handleSelectTab(targetRequestId);
          },
        });
        return;
      }

      closeOtherTabs(currentWorkspaceId, targetRequestId);
      handleSelectTab(targetRequestId);
    },
    [tabs, currentWorkspaceId, closeOtherTabs, handleSelectTab]
  );

  // Close tabs to right
  const handleCloseTabsToRight = useCallback(
    (targetRequestId) => {
      const tabIndex = tabs.findIndex((t) => t.requestId === targetRequestId);
      if (tabIndex === -1) return;

      const rightTabs = tabs.slice(tabIndex + 1);
      const hasDirty = rightTabs.some((t) => t.isDirty);

      if (hasDirty) {
        const dirtyTab = rightTabs.find((t) => t.isDirty);
        setConfirmCloseTab({
          ...dirtyTab,
          title: 'tabs to the right with unsaved changes',
          onConfirmAll: () => {
            closeTabsToRight(currentWorkspaceId, targetRequestId);
          },
        });
        return;
      }

      closeTabsToRight(currentWorkspaceId, targetRequestId);
    },
    [tabs, currentWorkspaceId, closeTabsToRight]
  );

  // Keyboard shortcuts: Ctrl+W to close active tab, Ctrl+Shift+[/] to cycle tabs
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key.toLowerCase() === 'w' && requestId) {
        e.preventDefault();
        handleRequestCloseTab(requestId);
      } else if (isCtrlOrCmd && e.shiftKey && (e.key === '[' || e.key === '{') && tabs.length > 1) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.requestId === (requestId || activeTabId));
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        handleSelectTab(tabs[prevIndex].requestId);
      } else if (isCtrlOrCmd && e.shiftKey && (e.key === ']' || e.key === '}') && tabs.length > 1) {
        e.preventDefault();
        const currentIndex = tabs.findIndex((t) => t.requestId === (requestId || activeTabId));
        const nextIndex = (currentIndex + 1) % tabs.length;
        handleSelectTab(tabs[nextIndex].requestId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestId, activeTabId, tabs, handleRequestCloseTab, handleSelectTab]);

  // Handle unauthorized or not logged in
  if (workspaceError?.response?.status === 401) {
    return (
      <AppShell>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[#090a0f]">
          <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Terminal size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            You must be signed in to access APIForge workspaces and execute requests.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
          >
            <span>Sign In to APIForge</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell workspaceId={currentWorkspaceId}>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Collection Navigation Tree Sidebar */}
        {!sidebarCollapsed && currentWorkspaceId && (
          <CollectionTree
            workspaceId={currentWorkspaceId}
            activeRequestId={requestId}
          />
        )}

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0d0f14]">
          {/* Multi-Request Tab Bar (shown whenever tabs are open or on request view) */}
          {tabs.length > 0 && (
            <RequestTabBar
              tabs={tabs}
              activeTabId={requestId || activeTabId}
              onSelectTab={handleSelectTab}
              onCloseTab={handleRequestCloseTab}
              onCloseOtherTabs={handleCloseOtherTabs}
              onCloseTabsToRight={handleCloseTabsToRight}
              onNewRequest={() => setIsNewRequestOpen(true)}
            />
          )}

          {loadingWorkspaces ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
              <span className="text-xs font-mono">Loading workspace...</span>
            </div>
          ) : requestId ? (
            <RequestWorkspace
              workspaceId={currentWorkspaceId}
              collectionId={collectionId}
              requestId={requestId}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none bg-[radial-gradient(#1a1d26_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="w-12 h-12 rounded-lg bg-[#111318] border border-[#232732] flex items-center justify-center text-sky-400 mb-4 shadow-xl">
                {collections.length > 0 ? (
                  <MousePointerClick size={22} />
                ) : (
                  <Layers size={22} />
                )}
              </div>

              {collections.length > 0 ? (
                <>
                  <h2 className="text-base font-semibold text-slate-100 mb-1">
                    Select a Request
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                    Choose a request from the collection tree on the left to inspect, configure, and execute it, or open multiple requests in tabs.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsNewRequestOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors mb-6 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>New Request</span>
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-slate-100 mb-1">
                    No Collections Yet
                  </h2>
                  <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                    Create your first collection in the sidebar to begin organizing folders and API requests.
                  </p>
                </>
              )}

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#111318] border border-[#232732] text-[11px] text-slate-400 font-mono">
                <Terminal size={12} className="text-sky-400" />
                <span>APIForge Shell Active • Multi-Request Tab System Online</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedTabDialog
        isOpen={Boolean(confirmCloseTab)}
        onClose={() => setConfirmCloseTab(null)}
        onConfirmDiscard={() => {
          if (confirmCloseTab?.onConfirmAll) {
            confirmCloseTab.onConfirmAll();
          } else if (confirmCloseTab) {
            executeCloseTab(confirmCloseTab);
          }
          setConfirmCloseTab(null);
        }}
        tabTitle={confirmCloseTab?.title || 'This request'}
      />

      {/* New Request Dialog */}
      <CreateRequestDialog
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        workspaceId={currentWorkspaceId}
        collectionId={collectionId || null}
      />
    </AppShell>
  );
}
