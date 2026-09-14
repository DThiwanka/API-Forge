import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWorkspaceMetrics,
  formatLastActivity,
  formatExecutionStatus,
  sanitizeActivityItem,
} from '../src/features/workspace/utils/workspaceDashboardUtils.js';
import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';

describe('Step 45: Workspace Overview & Developer Dashboard — Unit Verification', () => {
  describe('1. Summary Metrics Calculation from Loaded Cache', () => {
    const mockWorkspaceId = 'ws-test-123';
    const mockCollections = [
      { id: 'col-1', name: 'Users API', position: 1 },
      { id: 'col-2', name: 'Payments API', position: 2 },
      { id: 'col-3', name: 'Auth API', position: 3 },
    ];
    const mockEnvironments = [
      { id: 'env-1', name: 'Development', isActive: true },
      { id: 'env-2', name: 'Staging', isActive: false },
    ];

    const createMockQueryClient = (cacheMap) => ({
      getQueriesData: ({ queryKey }) => {
        const [prefix, wsId] = queryKey;
        const results = [];
        for (const [keyStr, val] of Object.entries(cacheMap)) {
          const parsedKey = JSON.parse(keyStr);
          if (parsedKey[0] === prefix && parsedKey[1] === wsId) {
            results.push([parsedKey, val]);
          }
        }
        return results;
      },
    });

    it('should aggregate counts for collections, requests, folders, and environments', () => {
      const cache = {
        '["requests","ws-test-123","col-1"]': [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
        '["requests","ws-test-123","col-2"]': [{ id: 'r4' }, { id: 'r5' }],
        '["requests","ws-test-123","col-3"]': [{ id: 'r6' }],
        '["folders","ws-test-123","col-1"]': [{ id: 'f1' }, { id: 'f2' }],
        '["folders","ws-test-123","col-2"]': [{ id: 'f3' }],
        // Another workspace should NOT bleed into metrics:
        '["requests","ws-other-999","col-x"]': [{ id: 'r999' }],
      };

      const client = createMockQueryClient(cache);
      const metrics = computeWorkspaceMetrics(client, mockWorkspaceId, mockCollections, mockEnvironments);

      assert.equal(metrics.collectionsCount, 3);
      assert.equal(metrics.environmentsCount, 2);
      assert.equal(metrics.requestsCount, 6);
      assert.equal(metrics.foldersCount, 3);
    });

    it('should handle empty collections and unpopulated caches gracefully', () => {
      const client = createMockQueryClient({});
      const metrics = computeWorkspaceMetrics(client, 'ws-empty', [], []);

      assert.equal(metrics.collectionsCount, 0);
      assert.equal(metrics.environmentsCount, 0);
      assert.equal(metrics.requestsCount, 0);
      assert.equal(metrics.foldersCount, 0);
    });

    it('should handle null or missing queryClient without crashing', () => {
      const metrics = computeWorkspaceMetrics(null, null, null, null);
      assert.equal(metrics.collectionsCount, 0);
      assert.equal(metrics.environmentsCount, 0);
      assert.equal(metrics.requestsCount, 0);
      assert.equal(metrics.foldersCount, 0);
    });
  });

  describe('2. Last Activity Formatter', () => {
    it('should format recent execution relative time correctly', () => {
      const now = Date.now();

      const justNow = [{ createdAt: new Date(now - 15 * 1000).toISOString() }];
      assert.equal(formatLastActivity(justNow, null), 'Just now');

      const minutesAgo = [{ createdAt: new Date(now - 12 * 60 * 1000).toISOString() }];
      assert.equal(formatLastActivity(minutesAgo, null), '12m ago');

      const hoursAgo = [{ createdAt: new Date(now - 3 * 3600 * 1000).toISOString() }];
      assert.equal(formatLastActivity(hoursAgo, null), '3h ago');

      const daysAgo = [{ createdAt: new Date(now - 4 * 86400 * 1000).toISOString() }];
      assert.equal(formatLastActivity(daysAgo, null), '4d ago');
    });

    it('should fall back to workspace updatedAt or createdAt when history is empty', () => {
      const now = Date.now();
      const wsWithUpdate = { updatedAt: new Date(now - 45 * 60 * 1000).toISOString() };
      assert.equal(formatLastActivity([], wsWithUpdate), '45m ago');

      const wsWithCreate = { createdAt: new Date(now - 2 * 3600 * 1000).toISOString() };
      assert.equal(formatLastActivity([], wsWithCreate), '2h ago');
    });

    it('should return null and not fabricate activity when no timestamps exist', () => {
      assert.equal(formatLastActivity([], null), null);
      assert.equal(formatLastActivity([], {}), null);
      assert.equal(formatLastActivity(null, null), null);
    });
  });

  describe('3. Execution Status Categorization vs Execution Failures', () => {
    it('should treat HTTP 2xx, 3xx, 4xx, and 5xx as server HTTP responses, NOT execution failures', () => {
      const res200 = formatExecutionStatus(200);
      assert.equal(res200.isExecutionFailure, false);
      assert.equal(res200.label, '200');
      assert.match(res200.colorClass, /emerald/);

      const res401 = formatExecutionStatus(401);
      assert.equal(res401.isExecutionFailure, false);
      assert.equal(res401.label, '401');
      assert.match(res401.colorClass, /amber/);

      const res404 = formatExecutionStatus(404);
      assert.equal(res404.isExecutionFailure, false);
      assert.equal(res404.label, '404');
      assert.match(res404.colorClass, /amber/);

      const res500 = formatExecutionStatus(500);
      assert.equal(res500.isExecutionFailure, false);
      assert.equal(res500.label, '500');
      assert.match(res500.colorClass, /rose/);
    });

    it('should distinguish network errors, timeouts, and execution failures', () => {
      const networkErr = formatExecutionStatus(0, 'NETWORK_ERROR');
      assert.equal(networkErr.isExecutionFailure, true);
      assert.equal(networkErr.label, 'Network Error');
      assert.match(networkErr.colorClass, /rose/);

      const timeoutErr = formatExecutionStatus(null, 'TIMEOUT');
      assert.equal(timeoutErr.isExecutionFailure, true);
      assert.equal(timeoutErr.label, 'Timeout');

      const blockedErr = formatExecutionStatus(undefined, 'BLOCKED_REQUEST');
      assert.equal(blockedErr.isExecutionFailure, true);
      assert.equal(blockedErr.label, 'Blocked Request');

      const genericFail = formatExecutionStatus(0);
      assert.equal(genericFail.isExecutionFailure, true);
      assert.equal(genericFail.label, 'Execution Failed');
    });
  });

  describe('4. Security & Data Confidentiality', () => {
    it('should strip sensitive headers, cookies, authorization tokens, and bodies', () => {
      const dirtyHistoryItem = {
        id: 'hist-1',
        requestId: 'req-1',
        collectionId: 'col-1',
        workspaceId: 'ws-1',
        method: 'POST',
        url: 'https://api.example.com/v1/checkout',
        status: 200,
        duration: 142,
        createdAt: '2026-09-14T20:00:00.000Z',
        // SENSITIVE FIELDS:
        headers: {
          Authorization: 'Bearer secret-jwt-token-12345',
          Cookie: 'session_id=super-secret-cookie',
        },
        requestBody: JSON.stringify({ cardNumber: '4111222233334444', cvv: '123' }),
        responseBody: JSON.stringify({ message: 'Success', token: 'secret-refresh-token' }),
        environmentVariables: { API_SECRET_KEY: 'top-secret' },
        request: { name: 'Process Payment' },
        environment: { name: 'Production' },
      };

      const safe = sanitizeActivityItem(dirtyHistoryItem);

      assert.equal(safe.id, 'hist-1');
      assert.equal(safe.method, 'POST');
      assert.equal(safe.url, 'https://api.example.com/v1/checkout');
      assert.equal(safe.status, 200);
      assert.equal(safe.requestName, 'Process Payment');
      assert.equal(safe.environmentName, 'Production');

      // Verify no sensitive fields leaked into safe object:
      assert.equal(safe.headers, undefined);
      assert.equal(safe.requestBody, undefined);
      assert.equal(safe.responseBody, undefined);
      assert.equal(safe.environmentVariables, undefined);
      assert.equal(safe.authorization, undefined);
      assert.equal(safe.cookies, undefined);
    });
  });

  describe('5. Workspace Tab System Integration & Isolation', () => {
    const wsA = 'ws-alpha';
    const wsB = 'ws-beta';

    it('should isolate open tabs and MRU history by workspaceId', () => {
      const store = useRequestTabStore.getState();

      store.openTab({
        workspaceId: wsA,
        collectionId: 'col-a',
        requestId: 'req-a1',
        title: 'Alpha Req 1',
        method: 'GET',
        url: 'https://api.alpha.test/items',
      });

      store.openTab({
        workspaceId: wsB,
        collectionId: 'col-b',
        requestId: 'req-b1',
        title: 'Beta Req 1',
        method: 'POST',
        url: 'https://api.beta.test/auth',
      });

      const tabsA = store.getTabs(wsA);
      const tabsB = store.getTabs(wsB);

      assert.equal(tabsA.length, 1);
      assert.equal(tabsA[0].requestId, 'req-a1');

      assert.equal(tabsB.length, 1);
      assert.equal(tabsB[0].requestId, 'req-b1');

      // Verify no cross-workspace leakage
      assert.equal(tabsA.some((t) => t.requestId === 'req-b1'), false);
      assert.equal(tabsB.some((t) => t.requestId === 'req-a1'), false);
    });

    it('should reuse existing tab when re-opening a request without creating duplicates', () => {
      const store = useRequestTabStore.getState();

      store.openTab({
        workspaceId: wsA,
        collectionId: 'col-a',
        requestId: 'req-a1',
        title: 'Alpha Req 1',
      });

      store.openTab({
        workspaceId: wsA,
        collectionId: 'col-a',
        requestId: 'req-a2',
        title: 'Alpha Req 2',
      });

      // Re-open req-a1:
      store.openTab({
        workspaceId: wsA,
        collectionId: 'col-a',
        requestId: 'req-a1',
      });

      const tabsA = store.getTabs(wsA);
      assert.equal(tabsA.length, 2);
      assert.equal(store.getActiveTabId(wsA), 'req-a1');
    });
  });

  describe('6. Permission Awareness & Role Restrictions', () => {
    it('should correctly identify Viewer role to restrict mutations', () => {
      const checkPermissions = (role) => ({
        isViewer: role === 'VIEWER',
        canCreateRequest: role !== 'VIEWER',
        canCreateCollection: role !== 'VIEWER',
        canImport: role !== 'VIEWER',
        canOpenCanvas: true,
        canViewHistory: true,
        canViewEnvironments: true,
      });

      const ownerPerms = checkPermissions('OWNER');
      assert.equal(ownerPerms.isViewer, false);
      assert.equal(ownerPerms.canCreateRequest, true);
      assert.equal(ownerPerms.canCreateCollection, true);
      assert.equal(ownerPerms.canImport, true);

      const adminPerms = checkPermissions('ADMIN');
      assert.equal(adminPerms.isViewer, false);
      assert.equal(adminPerms.canCreateRequest, true);

      const memberPerms = checkPermissions('MEMBER');
      assert.equal(memberPerms.isViewer, false);
      assert.equal(memberPerms.canCreateRequest, true);

      const viewerPerms = checkPermissions('VIEWER');
      assert.equal(viewerPerms.isViewer, true);
      assert.equal(viewerPerms.canCreateRequest, false);
      assert.equal(viewerPerms.canCreateCollection, false);
      assert.equal(viewerPerms.canImport, false);
      // Read-only navigation remains available:
      assert.equal(viewerPerms.canOpenCanvas, true);
      assert.equal(viewerPerms.canViewHistory, true);
      assert.equal(viewerPerms.canViewEnvironments, true);
    });
  });
});

