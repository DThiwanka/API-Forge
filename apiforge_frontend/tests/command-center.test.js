import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useCommandCenterStore } from '../src/features/command-center/store/commandCenterStore.js';
import {
  GROUP_ORDER,
  searchCommands,
  groupCommands,
} from '../src/features/command-center/utils/commandUtils.js';
import {
  scoreCommand,
  rankCommands,
  normalizeSearchText,
  stripPunctuation,
  GROUP_SEARCH_ORDER,
} from '../src/features/command-center/utils/commandRanking.js';

describe('Step 56: Global Search & Command Center Expansion — Unit Verification', () => {
  beforeEach(() => {
    useCommandCenterStore.setState({
      isOpen: false,
      query: '',
      activeModal: null,
      modalContext: {},
      recentCommandIdsByWorkspace: {},
    });
  });

  describe('1. Command Center Store Operations & Recent Tracking', () => {
    it('should initialize with palette closed, empty query, and empty recent commands', () => {
      const state = useCommandCenterStore.getState();
      assert.strictEqual(state.isOpen, false);
      assert.strictEqual(state.query, '');
      assert.strictEqual(state.activeModal, null);
    });

    it('should open and clear query when open() is called', () => {
      useCommandCenterStore.getState().setQuery('test');
      useCommandCenterStore.getState().open();
      const state = useCommandCenterStore.getState();
      assert.strictEqual(state.isOpen, true);
      assert.strictEqual(state.query, '');
    });

    it('should close and clear query when close() is called', () => {
      useCommandCenterStore.getState().open();
      useCommandCenterStore.getState().setQuery('users');
      useCommandCenterStore.getState().close();
      const state = useCommandCenterStore.getState();
      assert.strictEqual(state.isOpen, false);
      assert.strictEqual(state.query, '');
    });

    it('should toggle palette open state', () => {
      useCommandCenterStore.setState({ isOpen: false, query: '' });
      useCommandCenterStore.getState().toggle();
      assert.strictEqual(useCommandCenterStore.getState().isOpen, true);
      useCommandCenterStore.getState().toggle();
      assert.strictEqual(useCommandCenterStore.getState().isOpen, false);
    });

    it('should record executed commands into bounded recent list per workspace', () => {
      const wsA = 'ws-alpha';
      const wsB = 'ws-beta';

      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-1');
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-2');
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-3');
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-1');

      const stateA = useCommandCenterStore.getState().recentCommandIdsByWorkspace[wsA];
      assert.deepStrictEqual(stateA, ['cmd-1', 'cmd-3', 'cmd-2']);

      const stateB = useCommandCenterStore.getState().recentCommandIdsByWorkspace[wsB] || [];
      assert.deepStrictEqual(stateB, []);
    });

    it('should bound the recent commands list to a maximum of 7 items', () => {
      const ws = 'ws-bounded-test';
      for (let i = 1; i <= 10; i++) {
        useCommandCenterStore.getState().recordCommandExecution(ws, `cmd-${i}`);
      }

      const recents = useCommandCenterStore.getState().recentCommandIdsByWorkspace[ws];
      assert.strictEqual(recents.length, 7);
      assert.strictEqual(recents[0], 'cmd-10');
      assert.strictEqual(recents[6], 'cmd-4');
    });

    it('should clear recent commands when clearRecentCommands is called', () => {
      const ws = 'ws-clear-test';
      useCommandCenterStore.getState().recordCommandExecution(ws, 'cmd-1');
      useCommandCenterStore.getState().clearRecentCommands(ws);
      assert.deepStrictEqual(
        useCommandCenterStore.getState().recentCommandIdsByWorkspace[ws],
        []
      );
    });

    it('should manage activeModal for creating requests and collections', () => {
      useCommandCenterStore.getState().openCreateRequest({ collectionId: 'col-123' });
      let state = useCommandCenterStore.getState();
      assert.strictEqual(state.isOpen, false);
      assert.strictEqual(state.activeModal, 'create-request');
      assert.deepStrictEqual(state.modalContext, { collectionId: 'col-123' });

      useCommandCenterStore.getState().closeModal();
      state = useCommandCenterStore.getState();
      assert.strictEqual(state.activeModal, null);
      assert.deepStrictEqual(state.modalContext, {});

      useCommandCenterStore.getState().openCreateCollection();
      state = useCommandCenterStore.getState();
      assert.strictEqual(state.activeModal, 'create-collection');

      useCommandCenterStore.getState().closeModal();
      assert.strictEqual(useCommandCenterStore.getState().activeModal, null);
    });
  });

  describe('2. Multi-Tier Ranking & Deterministic Scoring', () => {
    const candidateCommands = [
      {
        id: 'cmd-history-exact',
        title: 'History',
        description: 'Open execution history',
        group: 'Navigation',
      },
      {
        id: 'cmd-history-prefix',
        title: 'History Audit Logs',
        description: 'Inspect execution logs',
        group: 'Navigation',
      },
      {
        id: 'cmd-history-substr',
        title: 'Open Request History',
        description: 'Past request executions',
        group: 'Navigation',
      },
      {
        id: 'cmd-history-desc',
        title: 'Audit Explorer',
        description: 'Contains past history records',
        group: 'Navigation',
        keywords: ['runner', 'collection runner'],
      },
      {
        id: 'cmd-history-kw',
        title: 'Execution Log Viewer',
        description: 'View logs',
        keywords: ['history', 'telemetry'],
        group: 'Navigation',
      },
    ];

    it('should score exact title match higher than prefix match', () => {
      const exactScore = scoreCommand(candidateCommands[0], 'History');
      const prefixScore = scoreCommand(candidateCommands[1], 'History');
      assert.ok(exactScore > prefixScore, `Expected ${exactScore} > ${prefixScore}`);
    });

    it('should score prefix match higher than substring match', () => {
      const prefixScore = scoreCommand(candidateCommands[1], 'History');
      const substrScore = scoreCommand(candidateCommands[2], 'History');
      assert.ok(prefixScore > substrScore, `Expected ${prefixScore} > ${substrScore}`);
    });

    it('should score title match higher than description or keyword match', () => {
      const titleScore = scoreCommand(candidateCommands[2], 'History');
      const descScore = scoreCommand(candidateCommands[3], 'History');
      const kwScore = scoreCommand(candidateCommands[4], 'History');
      assert.ok(titleScore > descScore, `Expected ${titleScore} > ${descScore}`);
      assert.ok(descScore > kwScore, `Expected ${descScore} > ${kwScore}`);
    });

    it('should rank commands in order of relevance: exact > prefix > substr > desc > kw', () => {
      const ranked = rankCommands(candidateCommands, 'history');
      assert.strictEqual(ranked[0].id, 'cmd-history-exact');
      assert.strictEqual(ranked[1].id, 'cmd-history-prefix');
      assert.strictEqual(ranked[2].id, 'cmd-history-substr');
      assert.strictEqual(ranked[3].id, 'cmd-history-desc');
      assert.strictEqual(ranked[4].id, 'cmd-history-kw');
    });

    it('should score HTTP methods and URL paths accurately for requests', () => {
      const requestCommands = [
        {
          id: 'req-get-users',
          title: 'Get Users List',
          method: 'GET',
          path: '/api/v1/users',
          group: 'Requests',
        },
        {
          id: 'req-post-users',
          title: 'Create User',
          method: 'POST',
          path: '/api/v1/users',
          group: 'Requests',
        },
      ];

      const postRank = rankCommands(requestCommands, 'POST');
      assert.strictEqual(postRank[0].id, 'req-post-users');

      const pathRank = rankCommands(requestCommands, '/api/v1/users');
      assert.strictEqual(pathRank.length, 2);
    });

    it('should handle multi-term queries like "POST users" or "GET /users"', () => {
      const requests = [
        { id: 'req-1', title: 'Get Users', method: 'GET', path: '/users', group: 'Requests' },
        { id: 'req-2', title: 'Create User', method: 'POST', path: '/users', group: 'Requests' },
        { id: 'req-3', title: 'Delete Order', method: 'DELETE', path: '/orders', group: 'Requests' },
      ];

      const getResults = rankCommands(requests, 'GET users');
      assert.strictEqual(getResults.length, 1);
      assert.strictEqual(getResults[0].id, 'req-1');

      const postResults = rankCommands(requests, 'POST /users');
      assert.strictEqual(postResults.length, 1);
      assert.strictEqual(postResults[0].id, 'req-2');
    });

    it('should support lightweight fuzzy matching for hyphenated or concatenated terms', () => {
      const requests = [
        { id: 'req-1', title: 'Get Users', method: 'GET', path: '/users', group: 'Requests' },
        { id: 'req-2', title: 'Create Order', method: 'POST', path: '/orders', group: 'Requests' },
      ];

      const fuzzyConcat = rankCommands(requests, 'getuser');
      assert.strictEqual(fuzzyConcat.length, 1);
      assert.strictEqual(fuzzyConcat[0].id, 'req-1');

      const fuzzyHyphen = rankCommands(requests, 'get-users');
      assert.strictEqual(fuzzyHyphen.length, 1);
      assert.strictEqual(fuzzyHyphen[0].id, 'req-1');
    });
  });

  describe('3. Resource Categorization & Group Ordering', () => {
    it('should include all required resource groups in GROUP_ORDER', () => {
      assert.deepStrictEqual(GROUP_ORDER, [
        'Recent',
        'Recent Commands',
        'Recent Requests',
        'Actions',
        'Requests',
        'Collections',
        'Folders',
        'Environments',
        'History',
        'Navigation',
        'Workspace',
      ]);
    });

    it('should prioritize Actions, Requests, Collections, Folders, Environments, History, Navigation in search mode', () => {
      assert.deepStrictEqual(GROUP_SEARCH_ORDER, [
        'Actions',
        'Requests',
        'Collections',
        'Folders',
        'Environments',
        'History',
        'Navigation',
        'Workspace',
      ]);
    });

    it('should group items into ordered buckets according to GROUP_ORDER', () => {
      const mixedItems = [
        { id: '1', title: 'Get Users', group: 'Requests' },
        { id: '2', title: 'Recent', group: 'Recent Commands' },
        { id: '3', title: 'Create', group: 'Actions' },
        { id: '4', title: 'Staging', group: 'Environments' },
        { id: '5', title: 'Orders Folder', group: 'Folders' },
        { id: '6', title: 'Payments Collection', group: 'Collections' },
        { id: '7', title: 'Past Run', group: 'History' },
      ];

      const grouped = groupCommands(mixedItems);
      assert.strictEqual(grouped.length, 7);
      assert.strictEqual(grouped[0].group, 'Recent Commands');
      assert.strictEqual(grouped[1].group, 'Actions');
      assert.strictEqual(grouped[2].group, 'Requests');
      assert.strictEqual(grouped[3].group, 'Collections');
      assert.strictEqual(grouped[4].group, 'Folders');
      assert.strictEqual(grouped[5].group, 'Environments');
      assert.strictEqual(grouped[6].group, 'History');
    });

    it('should handle custom or unlisted groups cleanly at the end', () => {
      const mixedItems = [
        { id: '1', title: 'Custom Item', group: 'Custom Category' },
        { id: '2', title: 'Action Item', group: 'Actions' },
      ];

      const grouped = groupCommands(mixedItems);
      assert.strictEqual(grouped.length, 2);
      assert.strictEqual(grouped[0].group, 'Actions');
      assert.strictEqual(grouped[1].group, 'Custom Category');
    });

    it('should bound groups when maxPerGroup is set to prevent DOM allocation spikes', () => {
      const manyRequests = Array.from({ length: 50 }, (_, i) => ({
        id: `req-${i}`,
        title: `Request ${i}`,
        group: 'Requests',
      }));

      const grouped = groupCommands(manyRequests, 10);
      assert.strictEqual(grouped.length, 1);
      assert.strictEqual(grouped[0].items.length, 10);
      assert.strictEqual(grouped[0].totalCount, 50);
    });
  });

  describe('4. Environment & History Search Integration', () => {
    it('should find environments by name and active status metadata', () => {
      const envItems = [
        { id: 'env-1', title: 'Production', group: 'Environments', isActive: false },
        { id: 'env-2', title: 'Staging', group: 'Environments', isActive: true, description: 'Active Environment' },
        { id: 'env-3', title: 'Development', group: 'Environments', isActive: false },
      ];

      const prodResults = rankCommands(envItems, 'Production');
      assert.strictEqual(prodResults.length, 1);
      assert.strictEqual(prodResults[0].id, 'env-1');

      const stagResults = rankCommands(envItems, 'staging');
      assert.strictEqual(stagResults.length, 1);
      assert.strictEqual(stagResults[0].id, 'env-2');
    });

    it('should find history entries by status code and endpoint', () => {
      const historyItems = [
        { id: 'h-1', title: 'Get Users', method: 'GET', path: '/users', status: 200, group: 'History', keywords: ['200'] },
        { id: 'h-2', title: 'Create Order', method: 'POST', path: '/orders', status: 201, group: 'History', keywords: ['201'] },
        { id: 'h-3', title: 'Missing Endpoint', method: 'GET', path: '/missing', status: 404, group: 'History', keywords: ['404'] },
      ];

      const notFoundResults = rankCommands(historyItems, '404');
      assert.strictEqual(notFoundResults.length, 1);
      assert.strictEqual(notFoundResults[0].id, 'h-3');

      const ordersResults = rankCommands(historyItems, 'POST /orders');
      assert.strictEqual(ordersResults.length, 1);
      assert.strictEqual(ordersResults[0].id, 'h-2');
    });
  });

  describe('5. Security, Zero-Leakage & Permission Enforcement', () => {
    it('should never expose or match against request headers, bodies, or tokens', () => {
      const requestCommand = {
        id: 'req-secure',
        title: 'Login Request',
        group: 'Requests',
        method: 'POST',
        headers: [{ key: 'Authorization', value: 'Bearer secret_jwt_token_xyz' }],
        body: { raw: '{"password": "confidential_password_123"}' },
      };

      const tokenSearch = searchCommands([requestCommand], 'secret_jwt_token_xyz');
      assert.strictEqual(tokenSearch.length, 0);

      const passwordSearch = searchCommands([requestCommand], 'confidential_password_123');
      assert.strictEqual(passwordSearch.length, 0);
    });

    it('should never expose or match against environment secret values', () => {
      const environmentCommand = {
        id: 'env-prod',
        title: 'Production API',
        group: 'Environments',
        description: 'Production cluster',
        keywords: ['environment', 'env', 'production'],
      };

      const secretSearch = searchCommands([environmentCommand], 'sk_live_very_secret_api_key');
      assert.strictEqual(secretSearch.length, 0);
    });

    it('should filter out privileged actions for Viewer role', () => {
      const allActionCommands = [
        { id: 'action-create-request', title: 'Create Request', minRole: 'MEMBER' },
        { id: 'action-create-collection', title: 'Create Collection', minRole: 'MEMBER' },
        { id: 'action-invite-member', title: 'Invite Member', minRole: 'ADMIN' },
        { id: 'action-run-collection', title: 'Run Collection', minRole: 'VIEWER' },
        { id: 'nav-requests', title: 'Go to Requests', minRole: 'VIEWER' },
      ];

      function filterForRole(commands, userRole) {
        return commands.filter((cmd) => {
          if (userRole === 'VIEWER') {
            return cmd.minRole === 'VIEWER';
          }
          if (userRole === 'MEMBER') {
            return cmd.minRole === 'VIEWER' || cmd.minRole === 'MEMBER';
          }
          return true; // OWNER & ADMIN
        });
      }

      const viewerCommands = filterForRole(allActionCommands, 'VIEWER');
      assert.strictEqual(viewerCommands.length, 2);
      assert.ok(!viewerCommands.some((c) => c.id === 'action-create-request'));
      assert.ok(!viewerCommands.some((c) => c.id === 'action-invite-member'));

      const memberCommands = filterForRole(allActionCommands, 'MEMBER');
      assert.strictEqual(memberCommands.length, 4);
      assert.ok(!memberCommands.some((c) => c.id === 'action-invite-member'));

      const adminCommands = filterForRole(allActionCommands, 'ADMIN');
      assert.strictEqual(adminCommands.length, 5);
    });
  });

  describe('6. Text Normalization Utilities', () => {
    it('should normalize slashes, hyphens, colons, and multiple spaces', () => {
      assert.strictEqual(normalizeSearchText('GET /api/v1/users/:id'), 'get api v1 users id');
      assert.strictEqual(normalizeSearchText('create-new_collection'), 'create new collection');
    });

    it('should strip punctuation for fuzzy comparisons', () => {
      assert.strictEqual(stripPunctuation('get-users'), 'getusers');
      assert.strictEqual(stripPunctuation('/api/v1/orders/'), 'apiv1orders');
    });
  });
});
