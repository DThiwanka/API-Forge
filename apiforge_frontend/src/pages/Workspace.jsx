import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import CollectionTree from '../features/collections/components/CollectionTree';
import RequestWorkspace from '../features/requests/components/RequestWorkspace';
import RequestTabBar from '../features/requests/components/RequestTabBar';
import UnsavedTabDialog from '../features/requests/components/UnsavedTabDialog';
import CreateRequestDialog from '../features/collections/components/CreateRequestDialog';
import OpenInBrowserModal from '../features/requests/components/OpenInBrowserModal';
import { useVariableSuggestions } from '../features/requests/hooks/useVariableSuggestions';
import { useWorkspacesQuery } from '../features/workspace/hooks/useWorkspace';
import useWorkspaceStore from '../features/workspace/store/workspaceStore';
import useRequestTabStore from '../features/requests/store/requestTabStore';
import useRequestStore from '../features/requests/store/requestStore';
import useCanvasStore from '../features/canvas/store/canvasStore';
import { toast } from '../stores/toastStore';
import { Loader2, Terminal, ArrowRight } from 'lucide-react';
import WorkspaceHome from './workspace/WorkspaceHome';

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

  // Close all tabs
  const handleCloseAllTabs = useCallback(() => {
    if (tabs.length === 0) return;
    const reqStore = useRequestStore.getState();
    const hasDirty = tabs.some((t) => t.isDirty || (t.requestId === reqStore.id && reqStore.isDirty));

    if (hasDirty) {
      const dirtyTab = tabs.find((t) => t.isDirty || (t.requestId === reqStore.id && reqStore.isDirty));
      setConfirmCloseTab({
        ...dirtyTab,
        title: 'all open tabs with unsaved changes',
        onConfirmAll: () => {
          tabs.forEach((t) => reqStore.clearDraft(t.requestId));
          useRequestTabStore.getState().clearWorkspaceTabs(currentWorkspaceId);
          navigate(`/workspace/${currentWorkspaceId}`);
        },
      });
      return;
    }

    tabs.forEach((t) => reqStore.clearDraft(t.requestId));
    useRequestTabStore.getState().clearWorkspaceTabs(currentWorkspaceId);
    navigate(`/workspace/${currentWorkspaceId}`);
  }, [tabs, currentWorkspaceId, navigate]);

  // Tab Copy URL
  const handleTabCopyUrl = useCallback((tab) => {
    if (!tab) return;
    const reqStore = useRequestStore.getState();
    const urlToCopy = (reqStore.id === tab.requestId ? reqStore.url : tab.url) || '';
    if (!urlToCopy) {
      toast.info('No URL configured on this request');
      return;
    }
    navigator.clipboard.writeText(urlToCopy)
      .then(() => toast.success('Request URL copied to clipboard'))
      .catch(() => toast.error('Failed to copy URL to clipboard'));
  }, []);

  // Tab Open in Canvas
  const handleTabOpenInCanvas = useCallback((tab) => {
    if (!tab) return;
    const reqStore = useRequestStore.getState();
    const reqData = reqStore.id === tab.requestId ? {
      id: tab.requestId,
      name: reqStore.name || tab.title,
      method: reqStore.method || tab.method,
      url: reqStore.url || tab.url,
      collectionId: tab.collectionId,
    } : {
      id: tab.requestId,
      name: tab.title,
      method: tab.method,
      url: tab.url,
      collectionId: tab.collectionId,
    };
    useCanvasStore.getState().addRequestNode(reqData);
    toast.success(`Added "${tab.title}" to Canvas`);
    navigate(`/workspace/${currentWorkspaceId}/canvas`);
  }, [currentWorkspaceId, navigate]);

  const [browserModalTab, setBrowserModalTab] = useState(null);
  const { variableMap, activeEnv } = useVariableSuggestions(currentWorkspaceId);

  const handleTabOpenInBrowser = useCallback((tab) => {
    if (!tab) return;
    const reqStore = useRequestStore.getState();
    const url = (reqStore.id === tab.requestId ? reqStore.url : tab.url) || '';
    const method = (reqStore.id === tab.requestId ? reqStore.method : tab.method) || 'GET';
    if (!url || !url.trim()) {
      toast.info('No URL configured on this request');
      return;
    }
    setBrowserModalTab({ url, method, title: tab.title });
  }, []);

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
              onCloseAllTabs={handleCloseAllTabs}
              onCopyUrl={handleTabCopyUrl}
              onOpenInCanvas={handleTabOpenInCanvas}
              onOpenInBrowser={handleTabOpenInBrowser}
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
            <WorkspaceHome
              workspaceId={currentWorkspaceId}
              onNewRequest={() => setIsNewRequestOpen(true)}
            />
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

      {/* Open in Browser Dialog */}
      <OpenInBrowserModal
        isOpen={Boolean(browserModalTab)}
        onClose={() => setBrowserModalTab(null)}
        workspaceId={currentWorkspaceId}
        url={browserModalTab?.url || ''}
        method={browserModalTab?.method || 'GET'}
        variableMap={variableMap}
        activeEnv={activeEnv}
      />
    </AppShell>
  );
}
