import { useState, useEffect, useMemo, useCallback } from 'react';
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

  const [liveEvents, setLiveEvents] = useState([]);

  // Fetch initial events buffer for the active tab
  const { data: initialEvents = [], isLoading } = useQuery({
    queryKey: ['browser-network', workspaceId, sessionId, tabId],
    queryFn: () => getTabNetworkActivity(workspaceId, sessionId, tabId),
    enabled: Boolean(workspaceId && sessionId && tabId),
    staleTime: 5000,
    refetchOnWindowFocus: false,
  });

  // Sync initial query data into local state when tabId or initial data changes
  useEffect(() => {
    if (initialEvents) {
      setLiveEvents(initialEvents);
    }
  }, [initialEvents, tabId]);

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
          setLiveEvents([]);
          setSelectedEventId(null);
          return;
        }

        if (type === 'request') {
          setLiveEvents((prev) => {
            // Check if already present
            if (prev.some((e) => e.id === data.id)) return prev;
            return [...prev, data];
          });
        } else if (type === 'response' || type === 'failed') {
          setLiveEvents((prev) =>
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
  }, [workspaceId, sessionId, tabId, isCapturing, setSelectedEventId]);

  // Clear tab network activity mutation
  const clearMutation = useMutation({
    mutationFn: () => clearTabNetworkActivity(workspaceId, sessionId, tabId),
    onSuccess: () => {
      setLiveEvents([]);
      setSelectedEventId(null);
      queryClient.setQueryData(['browser-network', workspaceId, sessionId, tabId], []);
    },
  });

  const clearActivity = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  // Filtered and searched events
  const filteredEvents = useMemo(() => {
    return liveEvents.filter((item) => {
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
  }, [liveEvents, networkFilter, networkSearch]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return liveEvents.find((e) => e.id === selectedEventId) || null;
  }, [liveEvents, selectedEventId]);

  return {
    events: filteredEvents,
    allEvents: liveEvents,
    totalCount: liveEvents.length,
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

