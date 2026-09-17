import { useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useBrowserStore from '../store/browserStore';
import {
  createBrowserSession,
  getBrowserSessions,
  closeBrowserSession,
  createBrowserTab,
  closeBrowserTab,
  navigateBrowserTab,
} from '../services/browserApi';

export function useBrowser(workspaceId) {
  const queryClient = useQueryClient();

  const activeSessionId = useBrowserStore((s) => s.activeSessionId);
  const setActiveSessionId = useBrowserStore((s) => s.setActiveSessionId);
  const activeTabId = useBrowserStore((s) => s.activeTabId);
  const setActiveTabId = useBrowserStore((s) => s.setActiveTabId);
  const addressBarValue = useBrowserStore((s) => s.addressBarValue);
  const setAddressBarValue = useBrowserStore((s) => s.setAddressBarValue);
  const isStoreLoading = useBrowserStore((s) => s.isLoading);
  const setIsStoreLoading = useBrowserStore((s) => s.setIsLoading);
  const error = useBrowserStore((s) => s.error);
  const setError = useBrowserStore((s) => s.setError);
  const clearError = useBrowserStore((s) => s.clearError);

  // Query: Get active sessions for this workspace
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['browser-sessions', workspaceId],
    queryFn: () => getBrowserSessions(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 10000,
  });

  // Mutation: Create session
  const createSessionMutation = useMutation({
    mutationFn: () => createBrowserSession(workspaceId),
    onSuccess: (newSession) => {
      if (newSession) {
        queryClient.setQueryData(['browser-sessions', workspaceId], (old = []) => [
          ...old,
          newSession,
        ]);
        setActiveSessionId(newSession.id);
        if (newSession.activeTabId) {
          setActiveTabId(newSession.activeTabId);
        }
      }
    },
    onError: (err) => {
      setError({
        code: err.response?.data?.error?.code || 'SESSION_CREATE_FAILED',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Mutation: Close session
  const closeSessionMutation = useMutation({
    mutationFn: (sessionId) => closeBrowserSession(workspaceId, sessionId),
    onSuccess: (_, closedSessionId) => {
      queryClient.setQueryData(['browser-sessions', workspaceId], (old = []) =>
        old.filter((s) => s.id !== closedSessionId)
      );
      if (activeSessionId === closedSessionId) {
        setActiveSessionId(null);
        setActiveTabId(null);
      }
    },
  });

  // Mutation: Create tab
  const createTabMutation = useMutation({
    mutationFn: ({ sessionId, url }) => createBrowserTab(workspaceId, sessionId, url),
    onSuccess: (updatedSession) => {
      if (updatedSession) {
        queryClient.setQueryData(['browser-sessions', workspaceId], (old = []) =>
          old.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        );
        setActiveTabId(updatedSession.activeTabId);
        clearError();
      }
    },
    onError: (err) => {
      setError({
        code: err.response?.data?.error?.code || 'TAB_CREATE_FAILED',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Mutation: Close tab
  const closeTabMutation = useMutation({
    mutationFn: ({ sessionId, tabId }) => closeBrowserTab(workspaceId, sessionId, tabId),
    onSuccess: (updatedSession) => {
      if (updatedSession) {
        queryClient.setQueryData(['browser-sessions', workspaceId], (old = []) =>
          old.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        );
        setActiveTabId(updatedSession.activeTabId);
        clearError();
      }
    },
  });

  // Mutation: Navigate tab
  const navigateMutation = useMutation({
    mutationFn: ({ sessionId, tabId, url, action }) =>
      navigateBrowserTab(workspaceId, sessionId, tabId, { url, action }),
    onMutate: () => {
      setIsStoreLoading(true);
      clearError();
    },
    onSuccess: (updatedSession) => {
      setIsStoreLoading(false);
      if (updatedSession) {
        queryClient.setQueryData(['browser-sessions', workspaceId], (old = []) =>
          old.map((s) => (s.id === updatedSession.id ? updatedSession : s))
        );
        clearError();
      }
    },
    onError: (err) => {
      setIsStoreLoading(false);
      setError({
        code: err.response?.data?.error?.code || 'NAVIGATION_FAILED',
        message: err.response?.data?.message || err.message,
      });
    },
  });

  // Ensure active session exists or create one
  useEffect(() => {
    if (!workspaceId || isLoadingSessions) return;

    if (sessions.length > 0) {
      if (!activeSessionId || !sessions.some((s) => s.id === activeSessionId)) {
        const first = sessions[0];
        setActiveSessionId(first.id);
        if (first.activeTabId) {
          setActiveTabId(first.activeTabId);
        }
      }
    } else if (!createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, [workspaceId, sessions, activeSessionId, isLoadingSessions, createSessionMutation, setActiveSessionId, setActiveTabId]);

  // Current active session
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  // Current tabs
  const tabs = useMemo(() => {
    return currentSession?.tabs || [];
  }, [currentSession]);

  // Ensure activeTabId is valid
  useEffect(() => {
    if (tabs.length > 0) {
      if (!activeTabId || !tabs.some((t) => t.id === activeTabId)) {
        setActiveTabId(tabs[0].id);
      }
    }
  }, [tabs, activeTabId, setActiveTabId]);

  // Current active tab
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0] || null;
  }, [tabs, activeTabId]);

  // Sync address bar value with active tab URL when active tab changes
  useEffect(() => {
    if (activeTab) {
      setAddressBarValue(activeTab.url || '');
    }
  }, [activeTab, setAddressBarValue]);

  // Actions
  const switchTab = useCallback(
    (tabId) => {
      setActiveTabId(tabId);
      clearError();
    },
    [setActiveTabId, clearError]
  );

  const newTab = useCallback(
    (initialUrl = '') => {
      if (!activeSessionId) return;
      createTabMutation.mutate({ sessionId: activeSessionId, url: initialUrl });
    },
    [activeSessionId, createTabMutation]
  );

  const closeTab = useCallback(
    (tabId) => {
      if (!activeSessionId) return;
      closeTabMutation.mutate({ sessionId: activeSessionId, tabId });
    },
    [activeSessionId, closeTabMutation]
  );

  const navigate = useCallback(
    (url) => {
      if (!activeSessionId || !activeTabId) return;
      navigateMutation.mutate({
        sessionId: activeSessionId,
        tabId: activeTabId,
        url,
        action: 'navigate',
      });
    },
    [activeSessionId, activeTabId, navigateMutation]
  );

  const back = useCallback(() => {
    if (!activeSessionId || !activeTabId) return;
    navigateMutation.mutate({
      sessionId: activeSessionId,
      tabId: activeTabId,
      action: 'back',
    });
  }, [activeSessionId, activeTabId, navigateMutation]);

  const forward = useCallback(() => {
    if (!activeSessionId || !activeTabId) return;
    navigateMutation.mutate({
      sessionId: activeSessionId,
      tabId: activeTabId,
      action: 'forward',
    });
  }, [activeSessionId, activeTabId, navigateMutation]);

  const reload = useCallback(() => {
    if (!activeSessionId || !activeTabId) return;
    navigateMutation.mutate({
      sessionId: activeSessionId,
      tabId: activeTabId,
      action: 'reload',
    });
  }, [activeSessionId, activeTabId, navigateMutation]);

  const closeSession = useCallback(() => {
    if (!activeSessionId) return;
    closeSessionMutation.mutate(activeSessionId);
  }, [activeSessionId, closeSessionMutation]);

  return {
    session: currentSession,
    sessions,
    tabs,
    activeTab,
    activeTabId,
    activeSessionId,
    addressBarValue,
    setAddressBarValue,
    isLoading: isStoreLoading || isLoadingSessions || navigateMutation.isPending || activeTab?.loading,
    error,
    clearError,
    switchTab,
    newTab,
    closeTab,
    navigate,
    back,
    forward,
    reload,
    closeSession,
    refetchSessions,
  };
}

export default useBrowser;
