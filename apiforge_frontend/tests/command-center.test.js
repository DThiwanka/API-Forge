import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useCommandCenterStore } from '../src/features/command-center/store/commandCenterStore.js';
import {
  GROUP_ORDER,
  searchCommands,
  groupCommands,
} from '../src/features/command-center/utils/commandUtils.js';

describe('Step 33: Command Center — Unit Verification', () => {
  describe('1. Command Center Store Operations', () => {
    it('should initialize with palette closed and empty query', () => {
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

  describe('2. Search & Deterministic Multi-Term Matching', () => {
    const mockCommands = [
      {
        id: 'cmd-1',
        title: 'Get User Profile',
        description: 'Fetch user details by ID',
        group: 'Requests',
        method: 'GET',
        path: '/api/v1/users/me',
        collectionName: 'User Management',
        keywords: ['user', 'profile'],
      },
      {
        id: 'cmd-2',
        title: 'Create User',
        description: 'Register a new user account',
        group: 'Requests',
        method: 'POST',
        path: '/api/v1/users',
        collectionName: 'User Management',
        keywords: ['register', 'user'],
      },
      {
        id: 'cmd-3',
        title: 'Create Request',
        description: 'Create a new API request in a collection',
        group: 'Actions',
        keywords: ['new request', 'add request'],
      },
      {
        id: 'cmd-4',
        title: 'Go to Collection Runner',
        description: 'Run automated test suites and sequential workflows',
        group: 'Navigation',
        keywords: ['runner', 'collection runner'],
      },
    ];

    it('should return all commands when query is empty or whitespace', () => {
      assert.strictEqual(searchCommands(mockCommands, '').length, 4);
      assert.strictEqual(searchCommands(mockCommands, '   ').length, 4);
      assert.strictEqual(searchCommands(mockCommands, null).length, 4);
    });

    it('should match case-insensitively across titles', () => {
      const results = searchCommands(mockCommands, 'user profile');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'cmd-1');
    });

    it('should match HTTP methods accurately', () => {
      const getResults = searchCommands(mockCommands, 'GET');
      assert.strictEqual(getResults.length, 1);
      assert.strictEqual(getResults[0].id, 'cmd-1');

      const postResults = searchCommands(mockCommands, 'POST');
      assert.strictEqual(postResults.length, 1);
      assert.strictEqual(postResults[0].id, 'cmd-2');
    });

    it('should match URL path tokens', () => {
      const results = searchCommands(mockCommands, '/users/me');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'cmd-1');
    });

    it('should match multi-term queries across multiple fields', () => {
      // "post users" matches method POST and path /users
      const results = searchCommands(mockCommands, 'post users');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'cmd-2');
    });

    it('should match action keywords and descriptions', () => {
      const results = searchCommands(mockCommands, 'runner');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].id, 'cmd-4');
    });

    it('should return empty list if terms do not match', () => {
      const results = searchCommands(mockCommands, 'nonexistent query 123');
      assert.strictEqual(results.length, 0);
    });
  });

  describe('3. Group Ordering & Structuring', () => {
    it('should preserve standard category group priority ordering', () => {
      assert.deepStrictEqual(GROUP_ORDER, [
        'Recent',
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
        { id: '2', title: 'B', group: 'Recent' },
        { id: '3', title: 'C', group: 'Actions' },
        { id: '4', title: 'D', group: 'Navigation' },
        { id: '5', title: 'E', group: 'Requests' },
      ];

      const grouped = groupCommands(mixedItems);
      assert.strictEqual(grouped.length, 4);
      assert.strictEqual(grouped[0].group, 'Recent');
      assert.strictEqual(grouped[1].group, 'Actions');
      assert.strictEqual(grouped[2].group, 'Navigation');
      assert.strictEqual(grouped[3].group, 'Requests');

      assert.strictEqual(grouped[3].items.length, 2);
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

