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
  Users,
  UserPlus,
  Globe,
  Download,
  Upload,
  Keyboard,
  Plus,
  Settings,
  User,
  Briefcase,
  Palette,
  Sliders,
  Shield,
} from 'lucide-react';
import useCommandCenterStore from '../store/commandCenterStore';
import { searchCommands, groupCommands } from '../utils/commandUtils';
import { useCollectionsQuery, useWorkspacesQuery } from '../../workspace/hooks/useWorkspace';
import { useEnvironmentsQuery } from '../../environments/hooks/useEnvironments';
import { useHistoryQuery } from '../../history/hooks/useHistory';
import { formatRelativeTime } from '../../history/utils/historyHelpers';
import useResourceNavigation from '../../../hooks/useResourceNavigation';
import useRequestTabStore from '../../requests/store/requestTabStore';
import useRequestStore from '../../requests/store/requestStore';
import useCollectionStore from '../../collections/store/collectionStore';
import useBrowserStore from '../../browser/store/browserStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { useUpdateRequestMutation, useDuplicateRequestMutation } from '../../requests/hooks/useRequest';
import { toast } from '../../../stores/toastStore';
import { redactUrl } from '../../../utils/redaction.js';
import { isMac } from '../../shortcuts/utils/shortcutUtils';
import useShortcutStore from '../../shortcuts/store/shortcutStore';

export function useCommandCenter(workspaceId) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openRequest } = useResourceNavigation(workspaceId);

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
  const isMacOS = useMemo(() => isMac(), []);

  // Collections for this workspace
  const { data: collections = [] } = useCollectionsQuery(workspaceId);

  // Environments for this workspace (safe metadata only)
  const { data: environments = [] } = useEnvironmentsQuery(workspaceId);

  // Execution History for this workspace
  const { data: historyData } = useHistoryQuery(workspaceId, { limit: 20 });

  // Open tabs & active tab for this workspace
  const tabs = useRequestTabStore((s) => s.tabsByWorkspace[workspaceId] || []);
  const mruHistory = useRequestTabStore((s) => s.historyByWorkspace[workspaceId] || []);
  const closeTab = useRequestTabStore((s) => s.closeTab);

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
  // Construct flat command and resource catalogue
  const allCommands = useMemo(() => {
    if (!workspaceId) return [];

    const list = [];
    const isSearching = Boolean(query && query.trim());

    // Helper maps for folders and collections
    const collectionMap = new Map(collections.map((c) => [c.id, c]));
    const folderMap = new Map(cachedData.folders.map((f) => [f.id, f]));

    // 1. RECENT REQUESTS (from tabs and MRU history stack)
    const recentIds = Array.from(new Set([...mruHistory].reverse()));
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
      .slice(0, 7);

    // Show "Recent Requests"
    for (const tab of recentTabs) {
      list.push({
        id: `recent-req-${tab.requestId}`,
        resourceType: 'request',
        resourceId: tab.requestId,
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
          openRequest(tab.requestId, {
            collectionId: tab.collectionId,
            folderId: tab.folderId,
            title: tab.title,
            method: tab.method,
            url: tab.path,
          });
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

      list.push({
        id: 'action-import-request',
        title: 'Import Request / Specification',
        description: 'Import cURL command, OpenAPI, or API collection',
        group: 'Actions',
        icon: Download,
        keywords: ['import', 'curl', 'openapi', 'swagger', 'load'],
        execute: () => {
          window.dispatchEvent(new CustomEvent('apiforge:open-import-dialog'));
        },
      });
    }

    list.push({
      id: 'action-export-collection',
      title: 'Export Collection',
      description: 'Export collection as OpenAPI specification or cURL commands',
      group: 'Actions',
      icon: Upload,
      keywords: ['export', 'openapi', 'swagger', 'curl', 'download'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('apiforge:open-export-dialog'));
      },
    });

    const canManageCollaboration = currentWs?.role === 'OWNER' || currentWs?.role === 'ADMIN';

    if (canManageCollaboration) {
      list.push({
        id: 'action-invite-member',
        title: 'Invite Member to Workspace',
        description: 'Send an email invitation to collaborate on this workspace',
        group: 'Actions',
        icon: UserPlus,
        keywords: ['invite', 'member', 'collaboration', 'email', 'add user', 'team'],
        execute: () => {
          window.dispatchEvent(new CustomEvent('apiforge:open-invite-dialog'));
        },
      });
    }

    list.push({
      id: 'action-keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts and power-user cheat sheet',
      group: 'Actions',
      icon: Keyboard,
      shortcut: isMacOS ? '⌘/' : 'Ctrl+/',
      keywords: ['shortcuts', 'hotkeys', 'cheat sheet', 'keybindings', 'keys', 'help'],
      execute: () => {
        useShortcutStore.getState().openHelpModal();
      },
    });

    if (!isViewer) {
      list.push({
        id: 'action-new-request',
        title: 'New Request',
        description: 'Create a new API request in current workspace',
        group: 'Actions',
        icon: Plus,
        shortcut: 'Alt+N',
        keywords: ['new', 'create', 'request', 'add'],
        execute: () => {
          window.dispatchEvent(new CustomEvent('apiforge:new-request'));
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
        shortcut: isMacOS ? '⌘↵' : 'Ctrl+Enter',
        keywords: ['send', 'execute', 'run', 'test', currentRequestName],
        execute: () => {
          const sendBtn = document.querySelector('button[title*="Send"]');
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
          shortcut: isMacOS ? '⌘S' : 'Ctrl+S',
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
          shortcut: isMacOS ? '⇧⌘S' : 'Ctrl+Shift+S',
          keywords: ['duplicate', 'clone', 'copy', currentRequestName],
          execute: async () => {
            const duplicated = await duplicateMutation.mutateAsync(currentRequestId);
            if (duplicated?.id) {
              openRequest(duplicated.id, {
                collectionId: currentCollectionId,
                title: duplicated.name || `${currentRequestName} (Copy)`,
                method: duplicated.method || 'GET',
                url: duplicated.url || '',
              });
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
        shortcut: isMacOS ? '⌘W' : 'Ctrl+W',
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

    list.push({
      id: 'nav-members',
      title: 'Open Workspace Members',
      description: 'Manage workspace collaboration, members, and roles',
      group: 'Navigation',
      icon: Users,
      keywords: ['members', 'users', 'collaboration', 'roles', 'invite', 'team'],
      execute: () => {
        window.dispatchEvent(new CustomEvent('apiforge:open-members-modal'));
      },
    });

    list.push({
      id: 'nav-settings',
      title: 'Open Settings',
      description: 'Configure account, workspace, appearance, and developer preferences',
      group: 'Navigation',
      icon: Settings,
      keywords: ['settings', 'preferences', 'configuration', 'account', 'options'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings`);
      },
    });

    list.push({
      id: 'nav-account-settings',
      title: 'Open Account Settings',
      description: 'View user profile, identity, and session details',
      group: 'Navigation',
      icon: User,
      keywords: ['account', 'profile', 'user', 'email', 'settings', 'sign out'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings/account`);
      },
    });

    list.push({
      id: 'nav-workspace-settings',
      title: 'Open Workspace Settings',
      description: 'Configure workspace name, description, and manage workspace settings',
      group: 'Navigation',
      icon: Briefcase,
      keywords: ['workspace settings', 'workspace', 'rename', 'delete workspace'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings/workspace`);
      },
    });

    list.push({
      id: 'nav-appearance-settings',
      title: 'Open Appearance Settings',
      description: 'Configure theme, display density, and reduced motion',
      group: 'Navigation',
      icon: Palette,
      keywords: ['appearance', 'theme', 'dark', 'light', 'density', 'compact', 'motion'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings/appearance`);
      },
    });

    list.push({
      id: 'nav-editor-settings',
      title: 'Open Editor Settings',
      description: 'Configure code font size, word wrap, and response formatting',
      group: 'Navigation',
      icon: Sliders,
      keywords: ['editor', 'font size', 'word wrap', 'json', 'formatting', 'developer'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings/editor`);
      },
    });

    list.push({
      id: 'nav-security-settings',
      title: 'Open Security Settings',
      description: 'Review authentication architecture, cookie security, and session management',
      group: 'Navigation',
      icon: Shield,
      keywords: ['security', 'auth', 'sessions', 'cookies', 'encryption', 'logout'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings/security`);
      },
    });

    list.push({
      id: 'nav-shortcuts-settings',
      title: 'Open Keyboard Shortcuts Settings',
      description: 'View and search keyboard shortcuts in Settings',
      group: 'Navigation',
      icon: Keyboard,
      keywords: ['shortcuts', 'hotkeys', 'cheat sheet', 'keybindings', 'settings'],
      execute: () => {
        navigate(`/workspace/${workspaceId}/settings/shortcuts`);
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
        const rawTabUrl = cached?.url || tab.url || '';
        const safeTabUrl = redactUrl(rawTabUrl);
        list.push({
          id: `req-${tab.requestId}`,
          resourceType: 'request',
          resourceId: tab.requestId,
          title: tab.title || 'Untitled Request',
          description: col ? `in ${col.name}` : 'Request',
          group: 'Requests',
          method: tab.method || 'GET',
          path: safeTabUrl,
          collectionName: col ? col.name : '',
          folderName: folder ? folder.name : undefined,
          keywords: [tab.title, tab.method, safeTabUrl, col ? col.name : ''],
          execute: () => {
            openRequest(tab.requestId, {
              collectionId: tab.collectionId,
              folderId: tab.folderId,
              title: tab.title,
              method: tab.method,
              url: tab.url,
            });
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
        const safeReqUrl = redactUrl(req.url || '');
        list.push({
          id: `req-${req.id}`,
          resourceType: 'request',
          resourceId: req.id,
          title: req.name || 'Untitled Request',
          description: `in ${col ? col.name : req.collectionName || 'Collection'}${safeReqUrl ? ` • ${safeReqUrl}` : ''}`,
          group: 'Requests',
          method: req.method || 'GET',
          path: safeReqUrl,
          collectionName: col ? col.name : req.collectionName || '',
          folderName: folder ? folder.name : undefined,
          keywords: [req.name, req.method, safeReqUrl, req.collectionName || ''],
          execute: () => {
            openRequest(req.id, {
              collectionId: req.collectionId,
              folderId: req.folderId,
              title: req.name,
              method: req.method,
              url: req.url,
            });
          },
        });
      }
    }

    // 5. COLLECTIONS
    for (const col of collections) {
      list.push({
        id: `col-${col.id}`,
        resourceType: 'collection',
        resourceId: col.id,
        title: col.name,
        description: col.description || `${col.requestsCount || 0} requests`,
        group: 'Collections',
        keywords: [col.name, col.description || '', 'collection'],
        execute: () => {
          useCollectionStore.getState().expandCollection(col.id);
          navigate(`/workspace/${workspaceId}/collections/${col.id}`);
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
        resourceType: 'folder',
        resourceId: f.id,
        title: f.name,
        description: f.collectionName ? `Folder in ${f.collectionName}` : 'Folder',
        group: 'Folders',
        collectionName: f.collectionName,
        folderName: f.name,
        icon: Folder,
        keywords: [f.name, f.collectionName || '', 'folder'],
        execute: () => {
          if (f.collectionId) {
            useCollectionStore.getState().expandCollection(f.collectionId);
          }
          useCollectionStore.getState().expandFolder(f.id);
          navigate(`/workspace/${workspaceId}`);
        },
      });
    }

    // 7. ENVIRONMENTS (Safe metadata only: never expose secrets or variable values)
    if (Array.isArray(environments)) {
      for (const env of environments) {
        list.push({
          id: `env-${env.id}`,
          resourceType: 'environment',
          resourceId: env.id,
          title: env.name,
          description: env.description || (env.isActive ? 'Active Environment' : 'Environment'),
          group: 'Environments',
          icon: Globe,
          isActive: env.isActive,
          keywords: ['environment', 'env', env.name, env.description || '', env.isActive ? 'active' : ''],
          execute: () => {
            navigate(`/workspace/${workspaceId}/environments`);
          },
        });
      }
    }

    // 8. HISTORY ENTRIES (If history records exist)
    const historyList = historyData?.history;
    if (Array.isArray(historyList) && historyList.length > 0) {
      for (const h of historyList) {
        const safeHistUrl = redactUrl(h.url || '');
        const histTitle = h.request?.name || safeHistUrl || 'History Entry';
        const timeAgo = formatRelativeTime(h.createdAt);
        list.push({
          id: `hist-${h.id}`,
          resourceType: 'history',
          resourceId: h.id,
          title: histTitle,
          method: h.method || 'GET',
          path: safeHistUrl,
          status: h.status,
          description: `${h.status || 'ERR'} • ${timeAgo}`,
          group: 'History',
          icon: History,
          keywords: ['history', h.method || '', safeHistUrl, String(h.status || ''), histTitle],
          execute: () => {
            if (h.requestId && h.collectionId) {
              openRequest(h.requestId, {
                collectionId: h.collectionId,
                title: histTitle,
                method: h.method,
                url: h.url,
              });
            } else {
              navigate(`/workspace/${workspaceId}/history`);
            }
          },
        });
      }
    }

    // 9. RECENT COMMANDS (When empty query, surface recently executed commands)
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
    environments,
    historyData,
    cachedData,
    tabs,
    mruHistory,
    currentRequestId,
    currentCollectionId,
    currentRequestName,
    currentRequestUrl,
    browserAddress,
    isViewer,
    currentWs?.role,
    isDirty,
    isSaving,
    recentCommandIds,
    updateMutation,
    duplicateMutation,
    getCleanPayload,
    openRequest,
    closeTab,
    openCreateRequest,
    openCreateCollection,
    addRequestNode,
    addCollectionNodes,
    navigate,
    isMacOS,
  ]);

  // Filtered and ranked commands
  const filteredCommands = useMemo(() => {
    return searchCommands(allCommands, query);
  }, [allCommands, query]);

  // Group commands bounded to max 20 per group for high performance
  const groupedCommands = useMemo(() => {
    return groupCommands(filteredCommands, 20);
  }, [filteredCommands]);

  const executeCommand = useCallback(
    (cmd) => {
      if (!cmd) return;

      // Validate stale/deleted resource safety before execution
      if (cmd.resourceType && cmd.resourceId) {
        if (cmd.resourceType === 'request') {
          const stillExists = cachedData.requests.some((r) => r.id === cmd.resourceId);
          const tabExists = tabs.some((t) => t.requestId === cmd.resourceId);
          if (!stillExists && !tabExists) {
            toast.error('This request is no longer available.');
            queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] });
            close();
            return;
          }
        } else if (cmd.resourceType === 'collection') {
          const stillExists = collections.some((c) => c.id === cmd.resourceId);
          if (!stillExists) {
            toast.error('This collection is no longer available.');
            queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
            close();
            return;
          }
        } else if (cmd.resourceType === 'folder') {
          const stillExists = cachedData.folders.some((f) => f.id === cmd.resourceId);
          if (!stillExists) {
            toast.error('This folder is no longer available.');
            queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] });
            close();
            return;
          }
        } else if (cmd.resourceType === 'environment') {
          const stillExists = environments.some((e) => e.id === cmd.resourceId);
          if (!stillExists) {
            toast.error('This environment is no longer available.');
            queryClient.invalidateQueries({ queryKey: ['environments', workspaceId] });
            close();
            return;
          }
        }
      }

      const originalId = cmd.id.startsWith('rec-') ? cmd.id.replace('rec-', '') : cmd.id;
      recordCommandExecution(workspaceId, originalId);

      close();
      cmd.execute?.();
    },
    [
      workspaceId,
      recordCommandExecution,
      close,
      cachedData,
      tabs,
      collections,
      environments,
      queryClient,
    ]
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
