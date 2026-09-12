import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  FilePlus,
  FolderPlus,
  Send,
  Save,
  XSquare,
  History,
  Play,
  Layers,
  Sparkles,
} from 'lucide-react';
import useCommandCenterStore from '../store/commandCenterStore';
import { searchCommands, groupCommands } from '../utils/commandUtils';
import { useCollectionsQuery } from '../../workspace/hooks/useWorkspace';
import useRequestTabStore from '../../requests/store/requestTabStore';
import useRequestStore from '../../requests/store/requestStore';
import { useUpdateRequestMutation } from '../../requests/hooks/useRequest';

export function useCommandCenter(workspaceId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isOpen = useCommandCenterStore((s) => s.isOpen);
  const query = useCommandCenterStore((s) => s.query);
  const open = useCommandCenterStore((s) => s.open);
  const close = useCommandCenterStore((s) => s.close);
  const toggle = useCommandCenterStore((s) => s.toggle);
  const setQuery = useCommandCenterStore((s) => s.setQuery);
  const openCreateRequest = useCommandCenterStore((s) => s.openCreateRequest);
  const openCreateCollection = useCommandCenterStore((s) => s.openCreateCollection);

  // Collections for this workspace
  const { data: collections = [] } = useCollectionsQuery(workspaceId);

  // Open tabs & active tab for this workspace
  const tabs = useRequestTabStore((s) => s.tabsByWorkspace[workspaceId] || []);
  const history = useRequestTabStore((s) => s.historyByWorkspace[workspaceId] || []);
  const closeTab = useRequestTabStore((s) => s.closeTab);

  // Current request store state
  const currentRequestId = useRequestStore((s) => s.id);
  const currentCollectionId = useRequestStore((s) => s.collectionId);
  const currentRequestName = useRequestStore((s) => s.name);
  const isSaving = useRequestStore((s) => s.isSaving);
  const isDirty = useRequestStore((s) => s.isDirty);
  const getCleanPayload = useRequestStore((s) => s.getCleanPayload);

  const updateMutation = useUpdateRequestMutation(
    workspaceId,
    currentCollectionId,
    currentRequestId
  );

  // Register Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  // Read cached requests for this workspace's collections from React Query cache
  const cachedRequestsByCollection = useMemo(() => {
    if (!workspaceId || !Array.isArray(collections)) return [];

    const requestList = [];
    const seenRequestIds = new Set();

    for (const col of collections) {
      const cached = queryClient.getQueryData(['requests', workspaceId, col.id]);
      if (Array.isArray(cached)) {
        for (const req of cached) {
          if (!seenRequestIds.has(req.id)) {
            seenRequestIds.add(req.id);
            requestList.push({
              ...req,
              collectionId: col.id,
              collectionName: col.name,
            });
          }
        }
      }
    }

    return requestList;
  }, [workspaceId, collections, queryClient]);

  // Construct flat command catalogue
  const allCommands = useMemo(() => {
    if (!workspaceId) return [];

    const list = [];

    // 1. RECENT REQUESTS (derived from tabs and recent history stack)
    const recentIds = Array.from(new Set([...history].reverse()));
    const recentTabs = recentIds
      .map((reqId) => tabs.find((t) => t.requestId === reqId))
      .filter(Boolean)
      .slice(0, 5);

    for (const tab of recentTabs) {
      list.push({
        id: `recent-${tab.requestId}`,
        title: tab.title || 'Untitled Request',
        description: `Open recent request in collection`,
        group: 'Recent',
        method: tab.method || 'GET',
        icon: Compass,
        keywords: ['recent', tab.title, tab.method],
        execute: () => {
          navigate(
            `/workspace/${workspaceId}/collections/${tab.collectionId}/requests/${tab.requestId}`
          );
        },
      });
    }

    // 2. ACTIONS
    list.push({
      id: 'action-create-request',
      title: 'Create Request',
      description: 'Create a new API request in a collection',
      group: 'Actions',
      icon: FilePlus,
      shortcut: 'N',
      keywords: ['new request', 'add request', 'create request', 'http'],
      execute: () => {
        openCreateRequest();
      },
    });

    list.push({
      id: 'action-create-collection',
      title: 'Create Collection',
      description: 'Create a new collection for requests',
      group: 'Actions',
      icon: FolderPlus,
      keywords: ['new collection', 'add collection', 'create collection', 'folder'],
      execute: () => {
        openCreateCollection();
      },
    });

    // Contextual Actions for active request workspace
    if (currentRequestId && currentCollectionId) {
      list.push({
        id: 'action-send-current-request',
        title: `Send "${currentRequestName || 'Current Request'}"`,
        description: 'Execute the currently active request immediately',
        group: 'Actions',
        icon: Send,
        shortcut: 'Ctrl+Enter',
        keywords: ['send', 'execute', 'run', 'test'],
        execute: () => {
          const sendBtn = document.querySelector('button[title*="Send (Ctrl+Enter)"]');
          if (sendBtn) {
            sendBtn.click();
          }
        },
      });

      list.push({
        id: 'action-save-current-request',
        title: `Save "${currentRequestName || 'Current Request'}"`,
        description: isDirty ? 'Save unsaved changes' : 'Request is up to date',
        group: 'Actions',
        icon: Save,
        shortcut: 'Ctrl+S',
        keywords: ['save', 'update', 'dirty'],
        execute: () => {
          if (!isSaving) {
            updateMutation.mutate(getCleanPayload());
          }
        },
      });

      list.push({
        id: 'action-close-current-tab',
        title: `Close Tab "${currentRequestName || 'Current Request'}"`,
        description: 'Close the current active request tab',
        group: 'Actions',
        icon: XSquare,
        shortcut: 'Ctrl+W',
        keywords: ['close tab', 'remove tab'],
        execute: () => {
          const { nextTab } = closeTab(workspaceId, currentRequestId);
          if (nextTab) {
            navigate(
              `/workspace/${workspaceId}/collections/${nextTab.collectionId}/requests/${nextTab.requestId}`
            );
          } else {
            navigate(`/workspace/${workspaceId}`);
          }
        },
      });
    }

    // 3. NAVIGATION
    list.push({
      id: 'nav-requests',
      title: 'Go to Request Workspace',
      description: 'Navigate to main request workbench',
      group: 'Navigation',
      icon: Compass,
      keywords: ['requests', 'workspace', 'home', 'bench'],
      execute: () => {
        navigate(`/workspace/${workspaceId}`);
      },
    });

    list.push({
      id: 'nav-runner',
      title: 'Go to Collection Runner',
      description: 'Run automated test suites and sequential workflows',
      group: 'Navigation',
      icon: Play,
      keywords: ['runner', 'collection runner', 'tests', 'execute'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/runner`);
      },
    });

    list.push({
      id: 'nav-environments',
      title: 'Go to Environments',
      description: 'Manage variables, secrets, and environments',
      group: 'Navigation',
      icon: Layers,
      keywords: ['environments', 'variables', 'env', 'tokens'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/environments`);
      },
    });

    list.push({
      id: 'nav-history',
      title: 'Go to Execution History',
      description: 'Inspect past executions, logs, and timing metrics',
      group: 'Navigation',
      icon: History,
      keywords: ['history', 'logs', 'audit', 'past'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/history`);
      },
    });

    list.push({
      id: 'nav-canvas',
      title: 'Go to Visual Canvas',
      description: 'Design and visualize request dependency graphs',
      group: 'Navigation',
      icon: Sparkles,
      keywords: ['canvas', 'visual', 'graph', 'nodes', 'flow'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/canvas`);
      },
    });

    // 4. REQUESTS (From Open Tabs & React Query Cache)
    const registeredRequestIds = new Set();

    // From open tabs first
    for (const tab of tabs) {
      if (!registeredRequestIds.has(tab.requestId)) {
        registeredRequestIds.add(tab.requestId);
        const col = collections.find((c) => c.id === tab.collectionId);
        list.push({
          id: `req-${tab.requestId}`,
          title: tab.title || 'Untitled Request',
          description: col ? `in ${col.name}` : 'Request',
          group: 'Requests',
          method: tab.method || 'GET',
          collectionName: col ? col.name : '',
          keywords: [tab.title, tab.method, col ? col.name : ''],
          execute: () => {
            navigate(
              `/workspace/${workspaceId}/collections/${tab.collectionId}/requests/${tab.requestId}`
            );
          },
        });
      }
    }

    // From cached requests query
    for (const req of cachedRequestsByCollection) {
      if (!registeredRequestIds.has(req.id)) {
        registeredRequestIds.add(req.id);
        list.push({
          id: `req-${req.id}`,
          title: req.name || 'Untitled Request',
          description: `in ${req.collectionName || 'Collection'}${req.url ? ` • ${req.url}` : ''}`,
          group: 'Requests',
          method: req.method || 'GET',
          path: req.url || '',
          collectionName: req.collectionName || '',
          keywords: [req.name, req.method, req.url || '', req.collectionName || ''],
          execute: () => {
            navigate(
              `/workspace/${workspaceId}/collections/${req.collectionId}/requests/${req.id}`
            );
          },
        });
      }
    }

    // 5. COLLECTIONS
    for (const col of collections) {
      list.push({
        id: `col-${col.id}`,
        title: col.name,
        description: col.description || `${col.requestsCount || 0} requests`,
        group: 'Collections',
        keywords: [col.name, col.description || '', 'collection'],
        execute: () => {
          navigate(`/workspace/${workspaceId}`);
        },
      });
    }

    return list;
  }, [
    workspaceId,
    collections,
    cachedRequestsByCollection,
    tabs,
    history,
    currentRequestId,
    currentCollectionId,
    currentRequestName,
    isDirty,
    isSaving,
    updateMutation,
    getCleanPayload,
    closeTab,
    openCreateRequest,
    openCreateCollection,
    navigate,
  ]);

  // Filtered and grouped commands
  const filteredCommands = useMemo(() => {
    return searchCommands(allCommands, query);
  }, [allCommands, query]);

  const groupedCommands = useMemo(() => {
    return groupCommands(filteredCommands);
  }, [filteredCommands]);

  const executeCommand = useCallback(
    (cmd) => {
      if (!cmd) return;
      close();
      cmd.execute?.();
    },
    [close]
  );

  return {
    isOpen,
    query,
    setQuery,
    open,
    close,
    toggle,
    allCommands,
    filteredCommands,
    groupedCommands,
    executeCommand,
  };
}

export default useCommandCenter;

