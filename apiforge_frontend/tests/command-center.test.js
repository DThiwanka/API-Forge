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
} from '../src/features/command-center/utils/commandRanking.js';

describe('Step 33/34: Command Center & Ranking — Unit Verification', () => {
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

      // Record commands in Workspace A
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-1');
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-2');
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-3');

      // Re-executing cmd-1 moves it to front and deduplicates
      useCommandCenterStore.getState().recordCommandExecution(wsA, 'cmd-1');

      const stateA = useCommandCenterStore.getState().recentCommandIdsByWorkspace[wsA];
      assert.deepStrictEqual(stateA, ['cmd-1', 'cmd-3', 'cmd-2']);

      // Workspace B must be isolated and unaffected
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

  describe('2. Multi-Tier Ranking Algorithm', () => {
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

      // Method search: POST should score higher on Create User than Get Users
      const postRank = rankCommands(requestCommands, 'POST');
      assert.strictEqual(postRank[0].id, 'req-post-users');

      // Path search: /api/v1/users should match both
      const pathRank = rankCommands(requestCommands, '/api/v1/users');
      assert.strictEqual(pathRank.length, 2);
    });
  });

  describe('3. Group Ordering & Structuring', () => {
    it('should preserve standard category group priority ordering with Recent Commands and Recent Requests', () => {
      assert.deepStrictEqual(GROUP_ORDER, [
        'Recent',
        'Recent Commands',
        'Recent Requests',
        'Actions',
        'Navigation',
        'Requests',
        'Collections',
        'Folders',
        'Workspace',
      ]);
    });

    it('should group items into ordered buckets according to GROUP_ORDER', () => {
      const mixedItems = [
        { id: '1', title: 'A', group: 'Requests' },
        { id: '2', title: 'B', group: 'Recent Commands' },
        { id: '3', title: 'C', group: 'Actions' },
        { id: '4', title: 'D', group: 'Recent Requests' },
        { id: '5', title: 'E', group: 'Folders' },
        { id: '6', title: 'F', group: 'Collections' },
      ];

      const grouped = groupCommands(mixedItems);
      assert.strictEqual(grouped.length, 6);
      assert.strictEqual(grouped[0].group, 'Recent Commands');
      assert.strictEqual(grouped[1].group, 'Recent Requests');
      assert.strictEqual(grouped[2].group, 'Actions');
      assert.strictEqual(grouped[3].group, 'Requests');
      assert.strictEqual(grouped[4].group, 'Collections');
      assert.strictEqual(grouped[5].group, 'Folders');
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
  });

  describe('4. Security & Data Integrity', () => {
    it('should never match or query against request headers, bodies, or secrets', () => {
      // Mock command item with private request properties
      const requestCommand = {
        id: 'req-secure',
        title: 'Login Request',
        group: 'Requests',
        method: 'POST',
        headers: [{ key: 'Authorization', value: 'Bearer super_secret_token_12345' }],
        body: { raw: '{"secretPassword": "super_secret_password"}' },
      };

      // Search for bearer token secret string
      const searchForBearer = searchCommands([requestCommand], 'super_secret_token_12345');
      assert.strictEqual(searchForBearer.length, 0);

      // Search for payload password secret string
      const searchForPassword = searchCommands([requestCommand], 'super_secret_password');
      assert.strictEqual(searchForPassword.length, 0);
    });
  });
});
