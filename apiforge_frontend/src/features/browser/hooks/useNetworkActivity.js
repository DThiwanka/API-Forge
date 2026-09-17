import { useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTabNetworkActivity,
  clearTabNetworkActivity,
  createNetworkEventSource,
} from '../services/browserApi';
import { useBrowserStore } from '../store/browserStore';

/**
 * Hook for managing live browser network activity, SSE subscription, filtering and search
 */
export function useNetworkActivity(workspaceId, sessionId, tabId) {
  const queryClient = useQueryClient();

  const isCapturing = useBrowserStore((s) => s.isCapturing);
  const networkFilter = useBrowserStore((s) => s.networkFilter);
  const networkSearch = useBrowserStore((s) => s.networkSearch);
  const selectedEventId = useBrowserStore((s) => s.selectedEventId);
  const setSelectedEventId = useBrowserStore((s) => s.setSelectedEventId);

  // Fetch initial events buffer for the active tab
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['browser-network', workspaceId, sessionId, tabId],
    queryFn: () => getTabNetworkActivity(workspaceId, sessionId, tabId),
    enabled: Boolean(workspaceId && sessionId && tabId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Connect SSE stream for the active tab
  useEffect(() => {
    if (!workspaceId || !sessionId || !tabId) return;

    const eventSource = createNetworkEventSource(
      workspaceId,
      sessionId,
      tabId,
      ({ type, data }) => {
        if (!isCapturing && type !== 'clear') return;

        if (type === 'clear') {
          queryClient.setQueryData(['browser-network', workspaceId, sessionId, tabId], []);
          setSelectedEventId(null);
          return;
        }

        if (type === 'request') {
          queryClient.setQueryData(['browser-network', workspaceId, sessionId, tabId], (prev = []) => {
            if (prev.some((e) => e.id === data.id)) return prev;
            return [...prev, data];
          });
        } else if (type === 'response' || type === 'failed') {
          queryClient.setQueryData(['browser-network', workspaceId, sessionId, tabId], (prev = []) =>
            prev.map((e) => (e.id === data.id ? { ...e, ...data } : e))
          );
        }
      }
    );

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [workspaceId, sessionId, tabId, isCapturing, setSelectedEventId, queryClient]);

  // Clear tab network activity mutation
  const clearMutation = useMutation({
    mutationFn: () => clearTabNetworkActivity(workspaceId, sessionId, tabId),
    onSuccess: () => {
      queryClient.setQueryData(['browser-network', workspaceId, sessionId, tabId], []);
      setSelectedEventId(null);
    },
  });

  const clearActivity = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  // Filtered and searched events
  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      // 1. Category Filter
      if (networkFilter === 'fetch') {
        if (item.resourceType !== 'fetch' && item.resourceType !== 'xhr') return false;
      } else if (networkFilter === 'doc') {
        if (item.resourceType !== 'document') return false;
      } else if (networkFilter === 'assets') {
        if (
          item.resourceType !== 'script' &&
          item.resourceType !== 'stylesheet' &&
          item.resourceType !== 'image' &&
          item.resourceType !== 'font'
        ) {
          return false;
        }
      } else if (networkFilter === 'errors') {
        const isError =
          item.state === 'failed' ||
          (typeof item.status === 'number' && item.status >= 400 && item.status < 600);
        if (!isError) return false;
      }

      // 2. Search Filter
      if (networkSearch && networkSearch.trim()) {
        const q = networkSearch.trim().toLowerCase();
        const matchesMethod = item.method?.toLowerCase().includes(q);
        const matchesPath = item.pathname?.toLowerCase().includes(q);
        const matchesHost = item.hostname?.toLowerCase().includes(q);
        const matchesUrl = item.url?.toLowerCase().includes(q);
        const matchesStatus = String(item.status || '').includes(q);
        if (!matchesMethod && !matchesPath && !matchesHost && !matchesUrl && !matchesStatus) {
          return false;
        }
      }

      return true;
    });
  }, [events, networkFilter, networkSearch]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  return {
    events: filteredEvents,
    allEvents: events,
    totalCount: events.length,
    filteredCount: filteredEvents.length,
    selectedEvent,
    selectedEventId,
    setSelectedEventId,
    clearActivity,
    isClearing: clearMutation.isPending,
    isLoading,
  };
}

export default useNetworkActivity;

