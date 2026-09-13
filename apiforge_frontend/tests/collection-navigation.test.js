import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  doesRequestMatch,
  doesFolderMatch,
  doesCollectionMatch,
  findAncestorFolderIds,
  getAllFolderIds,
} from '../src/features/collections/utils/collectionTreeUtils.js';
import { useCollectionStore } from '../src/features/collections/store/collectionStore.js';

describe('Step 43: Collection & Folder Navigation UX — Unit Verification', () => {
  describe('1. Search & Filtering Across Requests, Folders & Collections', () => {
    const sampleRequest1 = {
      id: 'req-1',
      name: 'User Login',
      method: 'POST',
      url: 'https://api.example.com/v1/auth/login',
      folderId: 'folder-auth',
    };

    const sampleRequest2 = {
      id: 'req-2',
      name: 'Get All Users',
      method: 'GET',
      url: 'https://api.example.com/v1/users',
      folderId: null,
    };

    it('should match request by name case-insensitively', () => {
      assert.equal(doesRequestMatch(sampleRequest1, 'login'), true);
      assert.equal(doesRequestMatch(sampleRequest1, 'USER'), true);
      assert.equal(doesRequestMatch(sampleRequest1, 'missing'), false);
    });

    it('should match request by HTTP method', () => {
      assert.equal(doesRequestMatch(sampleRequest1, 'post'), true);
      assert.equal(doesRequestMatch(sampleRequest1, 'POST'), true);
      assert.equal(doesRequestMatch(sampleRequest2, 'get'), true);
      assert.equal(doesRequestMatch(sampleRequest2, 'DELETE'), false);
    });

    it('should match request by URL path', () => {
      assert.equal(doesRequestMatch(sampleRequest1, '/auth/login'), true);
      assert.equal(doesRequestMatch(sampleRequest2, '/users'), true);
      assert.equal(doesRequestMatch(sampleRequest1, 'payments'), false);
    });

    it('should match folder by name or when containing matching request', () => {
      const folderAuth = {
        id: 'folder-auth',
        name: 'Authentication',
        children: [],
      };

      const folderEmpty = {
        id: 'folder-empty',
        name: 'Reports',
        children: [],
      };

      const allRequests = [sampleRequest1, sampleRequest2];

      // Folder matches by own name
      assert.equal(doesFolderMatch(folderAuth, allRequests, 'auth'), true);

      // Folder matches because it contains req-1 which matches "login"
      assert.equal(doesFolderMatch(folderAuth, allRequests, 'login'), true);

      // Empty folder does not match "login"
      assert.equal(doesFolderMatch(folderEmpty, allRequests, 'login'), false);
    });

    it('should match nested child folder recursively', () => {
      const deepFolder = {
        id: 'f-sub',
        name: 'OAuth2 Tokens',
        children: [],
      };

      const parentFolder = {
        id: 'f-parent',
        name: 'Security',
        children: [deepFolder],
      };

      assert.equal(doesFolderMatch(parentFolder, [], 'tokens'), true);
      assert.equal(doesFolderMatch(parentFolder, [], 'billing'), false);
    });

    it('should match collection when collection metadata or children match', () => {
      const collection = {
        id: 'col-1',
        name: 'User Management API',
        description: 'Endpoints for managing users and roles',
      };

      // Matches collection name
      assert.equal(doesCollectionMatch(collection, [], [], 'management'), true);

      // Matches collection description
      assert.equal(doesCollectionMatch(collection, [], [], 'roles'), true);

      // Matches request in collection
      assert.equal(doesCollectionMatch(collection, [], [sampleRequest1], 'login'), true);

      // Rejects when no match
      assert.equal(doesCollectionMatch(collection, [], [sampleRequest1], 'crypto'), false);
    });
  });

  describe('2. Hierarchy Preservation & Ancestor Folder Path Resolution', () => {
    const folderTree = [
      {
        id: 'f-1',
        name: 'V1',
        children: [
          {
            id: 'f-2',
            name: 'Auth',
            children: [
              {
                id: 'f-3',
                name: 'OAuth',
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'f-4',
        name: 'V2',
        children: [],
      },
    ];

    it('should resolve ancestor chain for deeply nested folder', () => {
      const ancestors = findAncestorFolderIds(folderTree, 'f-3');
      assert.deepEqual(ancestors, ['f-1', 'f-2']);
    });

    it('should resolve single ancestor for second level folder', () => {
      const ancestors = findAncestorFolderIds(folderTree, 'f-2');
      assert.deepEqual(ancestors, ['f-1']);
    });

    it('should return empty list for top-level folder or non-existent folder', () => {
      assert.deepEqual(findAncestorFolderIds(folderTree, 'f-1'), []);
      assert.deepEqual(findAncestorFolderIds(folderTree, 'f-nonexistent'), []);
    });

    it('should collect all folder IDs in tree for Expand All', () => {
      const allIds = getAllFolderIds(folderTree);
      assert.deepEqual(allIds.sort(), ['f-1', 'f-2', 'f-3', 'f-4'].sort());
    });
  });

  describe('3. Batch Expansion & Reveal Store State', () => {
    it('should expand multiple collections and folders simultaneously', () => {
      useCollectionStore.getState().collapseAll();

      const store = useCollectionStore.getState();
      store.expandAll(['col-1', 'col-2'], ['f-1', 'f-2']);

      const state = useCollectionStore.getState();
      assert.equal(state.expandedCollectionIds['col-1'], true);
      assert.equal(state.expandedCollectionIds['col-2'], true);
      assert.equal(state.expandedFolderIds['f-1'], true);
      assert.equal(state.expandedFolderIds['f-2'], true);
    });

    it('should collapse all collections and folders cleanly', () => {
      const store = useCollectionStore.getState();
      store.collapseAll(['col-1', 'col-2']);

      const state = useCollectionStore.getState();
      assert.equal(state.expandedCollectionIds['col-1'], false);
      assert.equal(state.expandedCollectionIds['col-2'], false);
      assert.deepEqual(state.expandedFolderIds, {});
    });

    it('should reveal ancestors of active request', () => {
      const store = useCollectionStore.getState();
      store.revealAncestors('col-alpha', ['f-parent', 'f-child']);

      const state = useCollectionStore.getState();
      assert.equal(state.expandedCollectionIds['col-alpha'], true);
      assert.equal(state.expandedFolderIds['f-parent'], true);
      assert.equal(state.expandedFolderIds['f-child'], true);
    });
  });

  describe('4. Inline Rename Validation & Trim Logic', () => {
    const validateRename = (newName) => {
      if (!newName || typeof newName !== 'string') {
        return { valid: false, error: 'Name cannot be empty' };
      }
      const trimmed = newName.trim();
      if (trimmed.length === 0) {
        return { valid: false, error: 'Name cannot be empty' };
      }
      return { valid: true, name: trimmed };
    };

    it('should validate and trim non-empty names', () => {
      const result = validateRename('  New Collection Name  ');
      assert.equal(result.valid, true);
      assert.equal(result.name, 'New Collection Name');
    });

    it('should reject empty or whitespace-only names', () => {
      assert.equal(validateRename('').valid, false);
      assert.equal(validateRename('    ').valid, false);
      assert.equal(validateRename(null).valid, false);
    });
  });

  describe('5. Permissions & Workspace Scoping', () => {
    it('should flag Viewer role as non-mutating', () => {
      const isViewerRole = (role) => role === 'VIEWER';

      assert.equal(isViewerRole('VIEWER'), true);
      assert.equal(isViewerRole('OWNER'), false);
      assert.equal(isViewerRole('ADMIN'), false);
      assert.equal(isViewerRole('MEMBER'), false);
    });
  });
});

