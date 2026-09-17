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
  Copy,
  Folder,
  Clock,
} from 'lucide-react';
import useCommandCenterStore from '../store/commandCenterStore';
import { searchCommands, groupCommands } from '../utils/commandUtils';
import { useCollectionsQuery, useWorkspacesQuery } from '../../workspace/hooks/useWorkspace';
import useRequestTabStore from '../../requests/store/requestTabStore';
import useRequestStore from '../../requests/store/requestStore';
import useBrowserStore from '../../browser/store/browserStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { useUpdateRequestMutation, useDuplicateRequestMutation } from '../../requests/hooks/useRequest';

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
  const recentCommandIds = useCommandCenterStore(
    (s) => s.recentCommandIdsByWorkspace[workspaceId] || []
  );
  const recordCommandExecution = useCommandCenterStore((s) => s.recordCommandExecution);

  // Workspaces and roles
  const { data: workspaces = [] } = useWorkspacesQuery();
  const currentWs = workspaces.find((w) => w.id === workspaceId);
  const isViewer = currentWs?.role === 'VIEWER';

  // Collections for this workspace
  const { data: collections = [] } = useCollectionsQuery(workspaceId);

  // Open tabs & active tab for this workspace
  const tabs = useRequestTabStore((s) => s.tabsByWorkspace[workspaceId] || []);
  const history = useRequestTabStore((s) => s.historyByWorkspace[workspaceId] || []);
  const closeTab = useRequestTabStore((s) => s.closeTab);
  const openTab = useRequestTabStore((s) => s.openTab);

  // Canvas store
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);
  const addCollectionNodes = useCanvasStore((s) => s.addCollectionNodes);

  // Current request store state
  const currentRequestId = useRequestStore((s) => s.id);
  const currentCollectionId = useRequestStore((s) => s.collectionId);
  const currentRequestName = useRequestStore((s) => s.name);
  const currentRequestUrl = useRequestStore((s) => s.url);
  const browserAddress = useBrowserStore((s) => s.addressBarValue);
  const isSaving = useRequestStore((s) => s.isSaving);
  const isDirty = useRequestStore((s) => s.isDirty);
  const getCleanPayload = useRequestStore((s) => s.getCleanPayload);

  const updateMutation = useUpdateRequestMutation(
    workspaceId,
    currentCollectionId,
    currentRequestId
  );

  const duplicateMutation = useDuplicateRequestMutation(
    workspaceId,
    currentCollectionId
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

  // Read cached requests & folders for this workspace's collections from React Query cache
  const cachedData = useMemo(() => {
    if (!workspaceId || !Array.isArray(collections)) return { requests: [], folders: [] };

    const requestList = [];
    const folderList = [];
    const seenRequestIds = new Set();
    const seenFolderIds = new Set();

    for (const col of collections) {
      // 1. Folders
      const cachedFolders = queryClient.getQueryData(['folders', workspaceId, col.id]);
      if (Array.isArray(cachedFolders)) {
        for (const f of cachedFolders) {
          if (!seenFolderIds.has(f.id)) {
            seenFolderIds.add(f.id);
            folderList.push({
              ...f,
              collectionId: col.id,
              collectionName: col.name,
            });
          }
        }
      }

      // 2. Requests
      const cachedRequests = queryClient.getQueryData(['requests', workspaceId, col.id]);
      if (Array.isArray(cachedRequests)) {
        for (const req of cachedRequests) {
          if (!seenRequestIds.has(req.id)) {
            seenRequestIds.add(req.id);
            const matchedFolder = folderList.find((f) => f.id === req.folderId);
            requestList.push({
              ...req,
              collectionId: col.id,
              collectionName: col.name,
              folderName: matchedFolder ? matchedFolder.name : undefined,
            });
          }
        }
      }
    }

    return { requests: requestList, folders: folderList };
  }, [workspaceId, collections, queryClient]);

  // Construct flat command catalogue
  const allCommands = useMemo(() => {
    if (!workspaceId) return [];

    const list = [];
    const isSearching = Boolean(query && query.trim());

    // Helper maps for folders and collections
    const collectionMap = new Map(collections.map((c) => [c.id, c]));
    const folderMap = new Map(cachedData.folders.map((f) => [f.id, f]));

    // 1. RECENT REQUESTS (from tabs and MRU history stack)
    const recentIds = Array.from(new Set([...history].reverse()));
    const recentTabs = recentIds
      .map((reqId) => {
        const t = tabs.find((tab) => tab.requestId === reqId);
        if (!t) return null;
        const cached = cachedData.requests.find((r) => r.id === reqId);
        const col = collectionMap.get(t.collectionId);
        const folder = cached?.folderId ? folderMap.get(cached.folderId) : null;
        return {
          ...t,
          path: cached?.url || t.url || '',
          collectionName: col ? col.name : '',
          folderName: folder ? folder.name : undefined,
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    // Show "Recent Requests"
    for (const tab of recentTabs) {
      list.push({
        id: `recent-req-${tab.requestId}`,
        title: tab.title || 'Untitled Request',
        description: tab.collectionName ? `in ${tab.collectionName}` : 'Recent request',
        group: isSearching ? 'Requests' : 'Recent Requests',
        method: tab.method || 'GET',
        path: tab.path || '',
        collectionName: tab.collectionName || '',
        folderName: tab.folderName || '',
        icon: Clock,
        keywords: ['recent', tab.title, tab.method, tab.path || '', tab.collectionName || ''],
        execute: () => {
          navigate(
            `/workspace/${workspaceId}/collections/${tab.collectionId}/requests/${tab.requestId}`
          );
        },
      });
    }

    // 2. ACTIONS
    if (!isViewer) {
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
    }

    // Contextual Actions for active request workspace
    if (currentRequestId && currentCollectionId) {
      const activeCol = collectionMap.get(currentCollectionId);
      const activeColName = activeCol ? activeCol.name : 'Collection';

      list.push({
        id: 'action-send-current-request',
        title: `Send "${currentRequestName || 'Current Request'}"`,
        description: 'Send the currently open API request',
        group: 'Actions',
        icon: Send,
        shortcut: 'Ctrl+Enter',
        keywords: ['send', 'execute', 'run', 'test', currentRequestName],
        execute: () => {
          const sendBtn = document.querySelector('button[title*="Send (Ctrl+Enter)"]');
          if (sendBtn) {
            sendBtn.click();
          }
        },
      });

      if (!isViewer) {
        list.push({
          id: 'action-save-current-request',
          title: `Save "${currentRequestName || 'Current Request'}"`,
          description: isDirty ? 'Save changes to the current request' : 'Current request is saved',
          group: 'Actions',
          icon: Save,
          shortcut: 'Ctrl+S',
          keywords: ['save', 'update', 'dirty', currentRequestName],
          execute: () => {
            if (!isSaving) {
              updateMutation.mutate(getCleanPayload());
            }
          },
        });

        list.push({
          id: 'action-duplicate-current-request',
          title: `Duplicate "${currentRequestName || 'Current Request'}"`,
          description: 'Duplicate current request and open in new tab',
          group: 'Actions',
          icon: Copy,
          keywords: ['duplicate', 'clone', 'copy', currentRequestName],
          execute: async () => {
            const duplicated = await duplicateMutation.mutateAsync(currentRequestId);
            if (duplicated?.id) {
              openTab({
                workspaceId,
                collectionId: currentCollectionId,
                requestId: duplicated.id,
                title: duplicated.name || `${currentRequestName} (Copy)`,
                method: duplicated.method || 'GET',
              });
              navigate(
                `/workspace/${workspaceId}/collections/${currentCollectionId}/requests/${duplicated.id}`
              );
            }
          },
        });
      }

      list.push({
        id: 'action-open-request-in-canvas',
        title: `Open "${currentRequestName || 'Current Request'}" in Canvas`,
        description: 'Add this request as a node on the Visual Canvas',
        group: 'Actions',
        icon: Sparkles,
        keywords: ['canvas', 'visual', 'node', currentRequestName],
        execute: () => {
          const currentReqData = {
            id: currentRequestId,
            name: currentRequestName,
            method: useRequestStore.getState().method,
            url: useRequestStore.getState().url,
          };
          addRequestNode(currentReqData, activeColName);
          navigate(`/workspace/${workspaceId}/canvas`);
        },
      });

      list.push({
        id: 'action-close-current-tab',
        title: `Close Tab "${currentRequestName || 'Current Request'}"`,
        description: 'Close the currently open request tab',
        group: 'Actions',
        icon: XSquare,
        shortcut: 'Ctrl+W',
        keywords: ['close tab', 'remove tab', currentRequestName],
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

      if (currentRequestUrl && currentRequestUrl.trim()) {
        list.push({
          id: 'action-open-request-in-browser',
          title: `Open Current Request in Browser`,
          description: `Open ${currentRequestUrl} in Browser Space`,
          group: 'Actions',
          icon: Compass,
          keywords: ['browser', 'open url', 'web', 'navigate', currentRequestUrl, currentRequestName || ''],
          execute: () => {
            navigate(`/workspace/${workspaceId}/browser?openUrl=${encodeURIComponent(currentRequestUrl.trim())}`);
          },
        });
      }
    }

    if (browserAddress && browserAddress.trim()) {
      list.push({
        id: 'action-open-browser-tab-in-api-client',
        title: 'Open Current Browser Tab in API Client',
        description: `Create API request from ${browserAddress}`,
        group: 'Actions',
        icon: Compass,
        keywords: ['api client', 'create request', 'draft', browserAddress],
        execute: () => {
          navigate(`/workspace/${workspaceId}/browser`);
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

    list.push({
      id: 'nav-browser',
      title: 'Open Browser Space',
      description: 'Open isolated developer browser space for documentation and APIs',
      group: 'Navigation',
      icon: Compass,
      keywords: ['browser', 'web', 'docs', 'portal', 'http'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/browser`);
      },
    });

    // 4. REQUESTS (From Open Tabs & Cache)
    const registeredRequestIds = new Set(recentTabs.map((t) => t.requestId));

    // Open Tabs that aren't in recent
    for (const tab of tabs) {
      if (!registeredRequestIds.has(tab.requestId)) {
        registeredRequestIds.add(tab.requestId);
        const col = collectionMap.get(tab.collectionId);
        const cached = cachedData.requests.find((r) => r.id === tab.requestId);
        const folder = cached?.folderId ? folderMap.get(cached.folderId) : null;
        list.push({
          id: `req-${tab.requestId}`,
          title: tab.title || 'Untitled Request',
          description: col ? `in ${col.name}` : 'Request',
          group: 'Requests',
          method: tab.method || 'GET',
          path: cached?.url || tab.url || '',
          collectionName: col ? col.name : '',
          folderName: folder ? folder.name : undefined,
          keywords: [tab.title, tab.method, cached?.url || tab.url || '', col ? col.name : ''],
          execute: () => {
            navigate(
              `/workspace/${workspaceId}/collections/${tab.collectionId}/requests/${tab.requestId}`
            );
          },
        });
      }
    }

    // Cached collection requests
    for (const req of cachedData.requests) {
      if (!registeredRequestIds.has(req.id)) {
        registeredRequestIds.add(req.id);
        const col = collectionMap.get(req.collectionId);
        const folder = req.folderId ? folderMap.get(req.folderId) : null;
        list.push({
          id: `req-${req.id}`,
          title: req.name || 'Untitled Request',
          description: `in ${col ? col.name : req.collectionName || 'Collection'}${req.url ? ` • ${req.url}` : ''}`,
          group: 'Requests',
          method: req.method || 'GET',
          path: req.url || '',
          collectionName: col ? col.name : req.collectionName || '',
          folderName: folder ? folder.name : undefined,
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

      // Contextual collection runner action
      list.push({
        id: `action-run-collection-${col.id}`,
        title: `Run Collection "${col.name}"`,
        description: 'Open this collection in Collection Runner',
        group: 'Actions',
        icon: Play,
        keywords: ['run', 'execute', col.name, 'collection runner'],
        execute: () => {
          navigate(`/workspace/${workspaceId}/runner`);
        },
      });

      // Contextual collection canvas action
      list.push({
        id: `action-canvas-collection-${col.id}`,
        title: `Open Collection "${col.name}" in Canvas`,
        description: 'Add all requests in this collection onto the Visual Canvas',
        group: 'Actions',
        icon: Sparkles,
        keywords: ['canvas', 'visual', col.name],
        execute: () => {
          const colRequests = cachedData.requests.filter((r) => r.collectionId === col.id);
          if (colRequests.length > 0) {
            addCollectionNodes(colRequests, col.name);
          }
          navigate(`/workspace/${workspaceId}/canvas`);
        },
      });
    }

    // 6. FOLDERS
    for (const f of cachedData.folders) {
      list.push({
        id: `folder-${f.id}`,
        title: f.name,
        description: f.collectionName ? `Folder in ${f.collectionName}` : 'Folder',
        group: 'Folders',
        collectionName: f.collectionName,
        folderName: f.name,
        icon: Folder,
        keywords: [f.name, f.collectionName || '', 'folder'],
        execute: () => {
          navigate(`/workspace/${workspaceId}`);
        },
      });
    }

    // 7. RECENT COMMANDS (When empty query, surface recently executed commands)
    if (!isSearching && Array.isArray(recentCommandIds) && recentCommandIds.length > 0) {
      const recentCommandsList = [];
      for (const recId of recentCommandIds) {
        const targetCmd = list.find((c) => c.id === recId);
        if (targetCmd && !recentCommandsList.some((rc) => rc.id === `rec-${recId}`)) {
          recentCommandsList.push({
            ...targetCmd,
            id: `rec-${targetCmd.id}`,
            group: 'Recent Commands',
          });
        }
      }
      list.unshift(...recentCommandsList);
    }

    return list;
  }, [
    workspaceId,
    query,
    collections,
    cachedData,
    tabs,
    history,
    currentRequestId,
    currentCollectionId,
    currentRequestName,
    currentRequestUrl,
    browserAddress,
    isViewer,
    isDirty,
    isSaving,
    recentCommandIds,
    updateMutation,
    duplicateMutation,
    getCleanPayload,
    closeTab,
    openTab,
    openCreateRequest,
    openCreateCollection,
    addRequestNode,
    addCollectionNodes,
    navigate,
  ]);

  // Filtered and ranked commands
  const filteredCommands = useMemo(() => {
    return searchCommands(allCommands, query);
  }, [allCommands, query]);

  // Group commands
  const groupedCommands = useMemo(() => {
    return groupCommands(filteredCommands);
  }, [filteredCommands]);

  const executeCommand = useCallback(
    (cmd) => {
      if (!cmd) return;
      const originalId = cmd.id.startsWith('rec-') ? cmd.id.replace('rec-', '') : cmd.id;
      recordCommandExecution(workspaceId, originalId);

      close();
      cmd.execute?.();
    },
    [workspaceId, recordCommandExecution, close]
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
