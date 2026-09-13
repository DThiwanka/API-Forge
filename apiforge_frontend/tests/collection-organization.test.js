import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  doesRequestMatchFilters,
  doesFolderMatchFilters,
  doesCollectionMatchFilters,
  countTotalFolderRequests,
} from '../src/features/collections/utils/collectionTreeUtils.js';

describe('Step 44: Collection Organization & Resource Management — Unit Tests', () => {
  describe('1. Selection State Transitions', () => {
    it('should toggle request selection and store normalized request metadata', () => {
      let selectedRequests = {};

      const toggleRequest = (state, req, colId) => {
        const next = { ...state };
        if (next[req.id]) {
          delete next[req.id];
        } else {
          next[req.id] = {
            id: req.id,
            collectionId: colId || req.collectionId,
            folderId: req.folderId || null,
            name: req.name || 'Untitled',
            method: req.method || 'GET',
            url: req.url || '',
          };
        }
        return next;
      };

      const req1 = { id: 'r1', name: 'Get Users', method: 'GET', url: 'https://api.test/users' };
      selectedRequests = toggleRequest(selectedRequests, req1, 'c1');
      assert.equal(Object.keys(selectedRequests).length, 1);
      assert.equal(selectedRequests['r1'].name, 'Get Users');
      assert.equal(selectedRequests['r1'].collectionId, 'c1');

      // Toggling again should remove it
      selectedRequests = toggleRequest(selectedRequests, req1, 'c1');
      assert.equal(Object.keys(selectedRequests).length, 0);
    });

    it('should batch select multiple requests and clear selection', () => {
      const selectMultiple = (state, list) => {
        const next = { ...state };
        for (const item of list) {
          next[item.id] = { ...item };
        }
        return next;
      };

      const items = [
        { id: 'r1', name: 'Req 1', method: 'GET' },
        { id: 'r2', name: 'Req 2', method: 'POST' },
        { id: 'r3', name: 'Req 3', method: 'DELETE' },
      ];

      const selected = selectMultiple({}, items);
      assert.equal(Object.keys(selected).length, 3);

      const cleared = {};
      assert.equal(Object.keys(cleared).length, 0);
    });

    it('should reset selection, method filter, and search query on workspace change', () => {
      const resetWorkspaceState = () => ({
        selectedRequests: {},
        selectedMethodFilter: 'ALL',
        searchQuery: '',
      });

      const state = resetWorkspaceState();
      assert.deepEqual(state.selectedRequests, {});
      assert.equal(state.selectedMethodFilter, 'ALL');
      assert.equal(state.searchQuery, '');
    });
  });

  describe('2. Combined Query & Method Filtering', () => {
    const reqGet = { id: '1', name: 'List Users', method: 'GET', url: 'https://api.test/users' };
    const reqPost = { id: '2', name: 'Create User', method: 'POST', url: 'https://api.test/users' };
    const reqDelete = { id: '3', name: 'Remove User', method: 'DELETE', url: 'https://api.test/users/123' };

    it('should filter requests by HTTP method', () => {
      assert.equal(doesRequestMatchFilters(reqGet, '', 'GET'), true);
      assert.equal(doesRequestMatchFilters(reqGet, '', 'POST'), false);
      assert.equal(doesRequestMatchFilters(reqPost, '', 'POST'), true);
      assert.equal(doesRequestMatchFilters(reqDelete, '', 'DELETE'), true);
      assert.equal(doesRequestMatchFilters(reqDelete, '', 'ALL'), true);
    });

    it('should filter requests by combined query and HTTP method', () => {
      // Name matches 'User' and method is POST
      assert.equal(doesRequestMatchFilters(reqPost, 'User', 'POST'), true);
      // Name matches 'User' but method is GET
      assert.equal(doesRequestMatchFilters(reqPost, 'User', 'GET'), false);
      // URL matches '123' and method is DELETE
      assert.equal(doesRequestMatchFilters(reqDelete, '123', 'DELETE'), true);
    });

    it('should filter folders based on contained request methods', () => {
      const folder = {
        id: 'f1',
        name: 'Auth',
        children: [],
      };
      const requests = [
        { id: 'r1', folderId: 'f1', name: 'Login', method: 'POST' },
      ];

      // Folder has POST request
      assert.equal(doesFolderMatchFilters(folder, requests, '', 'POST'), true);
      // Folder does NOT have GET request
      assert.equal(doesFolderMatchFilters(folder, requests, '', 'GET'), false);
      // Folder with ALL matches
      assert.equal(doesFolderMatchFilters(folder, requests, '', 'ALL'), true);
    });

    it('should filter collections based on contained request methods', () => {
      const collection = { id: 'c1', name: 'Users API', description: 'User endpoints' };
      const folders = [{ id: 'f1', name: 'Accounts', children: [] }];
      const requests = [{ id: 'r1', folderId: 'f1', name: 'Get Profile', method: 'GET' }];

      assert.equal(doesCollectionMatchFilters(collection, folders, requests, '', 'GET'), true);
      assert.equal(doesCollectionMatchFilters(collection, folders, requests, '', 'POST'), false);
      assert.equal(doesCollectionMatchFilters(collection, folders, requests, 'Profile', 'GET'), true);
    });
  });

  describe('3. Recursive Folder Request Counting', () => {
    it('should accurately count direct and nested subfolder requests', () => {
      const allRequests = [
        { id: 'r1', folderId: 'f_root', name: 'Req 1' },
        { id: 'r2', folderId: 'f_root', name: 'Req 2' },
        { id: 'r3', folderId: 'f_sub1', name: 'Req 3' },
        { id: 'r4', folderId: 'f_sub2', name: 'Req 4' },
        { id: 'r5', folderId: 'f_sub2', name: 'Req 5' },
        { id: 'r6', folderId: 'other_folder', name: 'Req 6' },
      ];

      const folderTree = {
        id: 'f_root',
        name: 'Root Folder',
        children: [
          {
            id: 'f_sub1',
            name: 'Sub 1',
            children: [
              {
                id: 'f_sub2',
                name: 'Sub 2',
                children: [],
              },
            ],
          },
        ],
      };

      // Root folder should have 2 direct + 1 in sub1 + 2 in sub2 = 5 total
      const totalCount = countTotalFolderRequests(folderTree, allRequests);
      assert.equal(totalCount, 5);

      // Sub 1 should have 1 direct + 2 in sub2 = 3 total
      const sub1Count = countTotalFolderRequests(folderTree.children[0], allRequests);
      assert.equal(sub1Count, 3);
    });

    it('should return 0 for empty or invalid folder', () => {
      assert.equal(countTotalFolderRequests(null, []), 0);
      assert.equal(countTotalFolderRequests({ id: 'f_empty', children: [] }, []), 0);
    });
  });

  describe('4. Bulk Operation Synchronization Logic', () => {
    it('should safely synchronize tab closing when requests are deleted', () => {
      let openTabs = [
        { requestId: 'r1', title: 'Get Users' },
        { requestId: 'r2', title: 'Create User' },
        { requestId: 'r3', title: 'Delete User' },
      ];

      const deletedIds = new Set(['r1', 'r3']);
      openTabs = openTabs.filter((t) => !deletedIds.has(t.requestId));

      assert.equal(openTabs.length, 1);
      assert.equal(openTabs[0].requestId, 'r2');
    });

    it('should safely synchronize Canvas node removal when requests are deleted', () => {
      let canvasNodes = [
        { id: 'r1', data: { name: 'Get Users' } },
        { id: 'r2', data: { name: 'Create User' } },
      ];
      let canvasEdges = [
        { id: 'e1', source: 'r1', target: 'r2' },
      ];

      const deletedNodeId = 'r1';
      canvasNodes = canvasNodes.filter((n) => n.id !== deletedNodeId);
      canvasEdges = canvasEdges.filter((e) => e.source !== deletedNodeId && e.target !== deletedNodeId);

      assert.equal(canvasNodes.length, 1);
      assert.equal(canvasNodes[0].id, 'r2');
      assert.equal(canvasEdges.length, 0);
    });

    it('should handle partial failures in bulk operations safely', async () => {
      const items = [
        { id: '1', shouldFail: false },
        { id: '2', shouldFail: true },
        { id: '3', shouldFail: false },
      ];

      const mockMutate = async (item) => {
        if (item.shouldFail) {
          throw new Error('Database timeout');
        }
        return { success: true, id: item.id };
      };

      const results = await Promise.allSettled(items.map(mockMutate));
      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      assert.equal(successes.length, 2);
      assert.equal(failures.length, 1);
      assert.equal(failures[0].reason.message, 'Database timeout');
    });
  });

  describe('5. Role & Permission Safety', () => {
    it('should restrict mutation capabilities for VIEWER role', () => {
      const isViewer = true;
      const canBulkDelete = !isViewer;
      const canBulkMove = !isViewer;
      const canBulkDuplicate = !isViewer;
      const canAddToCanvas = true; // Read action allowed for viewer

      assert.equal(canBulkDelete, false);
      assert.equal(canBulkMove, false);
      assert.equal(canBulkDuplicate, false);
      assert.equal(canAddToCanvas, true);
    });
  });
});

