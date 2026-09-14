import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';
import { useCanvasStore } from '../src/features/canvas/store/canvasStore.js';
import { useCollectionStore } from '../src/features/collections/store/collectionStore.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';
import {
  requestToNode,
  serializeCanvas,
  deserializeCanvas,
  computeDeterministicLayout,
} from '../src/features/canvas/utils/nodeHelpers.js';

describe('Step 47: Canvas ↔ Request Workspace ↔ Collection Integration', () => {
  const workspaceId = 'ws-test-47';
  const collectionId = 'col-test-47';

  beforeEach(() => {
    useRequestTabStore.getState().clearWorkspaceTabs(workspaceId);
    useCanvasStore.getState().resetCanvas();
    useRequestStore.setState({
      id: null,
      workspaceId: null,
      collectionId: null,
      name: 'Untitled Request',
      method: 'GET',
      url: '',
      isDirty: false,
      drafts: {},
    });
    useCollectionStore.setState({
      expandedCollectionIds: {},
      expandedFolderIds: {},
      searchQuery: '',
    });
  });

  describe('1. Canonical Resource Identity & Duplicate Prevention', () => {
    it('opens a request tab and activates it', () => {
      const tabStore = useRequestTabStore.getState();
      tabStore.openTab({
        workspaceId,
        collectionId,
        requestId: 'req-1',
        title: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      });

      const tabs = tabStore.getTabs(workspaceId);
      assert.equal(tabs.length, 1);
      assert.equal(tabs[0].requestId, 'req-1');
      assert.equal(tabStore.getActiveTabId(workspaceId), 'req-1');
    });

    it('does not create duplicate tabs when opening an already opened request', () => {
      const tabStore = useRequestTabStore.getState();
      tabStore.openTab({
        workspaceId,
        collectionId,
        requestId: 'req-1',
        title: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
      });

      // Open a second request
      tabStore.openTab({
        workspaceId,
        collectionId,
        requestId: 'req-2',
        title: 'Create User',
        method: 'POST',
      });

      assert.equal(tabStore.getTabs(workspaceId).length, 2);
      assert.equal(tabStore.getActiveTabId(workspaceId), 'req-2');

      // Re-open req-1: Should activate req-1 without increasing length
      tabStore.openTab({
        workspaceId,
        collectionId,
        requestId: 'req-1',
        title: 'Get Users (Updated)',
        method: 'GET',
      });

      const tabsAfter = tabStore.getTabs(workspaceId);
      assert.equal(tabsAfter.length, 2);
      assert.equal(tabStore.getActiveTabId(workspaceId), 'req-1');
      assert.equal(tabsAfter[0].title, 'Get Users (Updated)');
    });
  });

  describe('2. Cross-Interface State Synchronization (Rename & Delete)', () => {
    it('updates tab meta and canvas node data when a request is renamed', () => {
      // 1. Open tab
      useRequestTabStore.getState().openTab({
        workspaceId,
        collectionId,
        requestId: 'req-sync-1',
        title: 'Old Title',
        method: 'GET',
        url: 'https://api.example.com/old',
      });

      // 2. Add node to canvas
      useCanvasStore.getState().addRequestNode({
        id: 'req-sync-1',
        collectionId,
        name: 'Old Title',
        method: 'GET',
        url: 'https://api.example.com/old',
      }, 'Users Collection');

      // 3. Perform updateNodeData and updateTabMeta (as executed by useUpdateRequestMutation)
      useRequestTabStore.getState().updateTabMeta(workspaceId, 'req-sync-1', {
        title: 'New Renamed Title',
        method: 'PATCH',
        url: 'https://api.example.com/new',
      });

      useCanvasStore.getState().updateNodeData('req-sync-1', {
        name: 'New Renamed Title',
        method: 'PATCH',
        url: 'https://api.example.com/new',
      });

      // Verify Tab Store updated
      const activeTab = useRequestTabStore.getState().getActiveTab(workspaceId);
      assert.equal(activeTab.title, 'New Renamed Title');
      assert.equal(activeTab.method, 'PATCH');
      assert.equal(activeTab.url, 'https://api.example.com/new');

      // Verify Canvas Node updated
      const canvasNode = useCanvasStore.getState().nodes.find((n) => n.id === 'req-sync-1');
      assert.ok(canvasNode);
      assert.equal(canvasNode.data.name, 'New Renamed Title');
      assert.equal(canvasNode.data.method, 'PATCH');
      assert.equal(canvasNode.data.url, 'https://api.example.com/new');
    });

    it('closes tab and removes canvas node when a request is deleted', () => {
      // 1. Open tab
      useRequestTabStore.getState().openTab({
        workspaceId,
        collectionId,
        requestId: 'req-del-1',
        title: 'To Be Deleted',
      });

      // 2. Add node to canvas
      useCanvasStore.getState().addRequestNode({
        id: 'req-del-1',
        collectionId,
        name: 'To Be Deleted',
      }, 'Users Collection');

      assert.equal(useRequestTabStore.getState().getTabs(workspaceId).length, 1);
      assert.equal(useCanvasStore.getState().nodes.length, 1);

      // 3. Simulate delete mutation side-effects
      useRequestTabStore.getState().closeTab(workspaceId, 'req-del-1');
      useCanvasStore.getState().removeNodeFromCanvas('req-del-1');

      // Verify Tab is closed
      assert.equal(useRequestTabStore.getState().getTabs(workspaceId).length, 0);
      assert.equal(useRequestTabStore.getState().getActiveTabId(workspaceId), null);

      // Verify Canvas Node is removed
      assert.equal(useCanvasStore.getState().nodes.length, 0);
    });
  });

  describe('3. Collection Tree Ancestor Reveal & Breadcrumb Synchronization', () => {
    it('expands collection and ancestor folders when revealing a resource', () => {
      const colStore = useCollectionStore.getState();

      colStore.revealAncestors('col-auth', ['folder-oauth', 'folder-v2']);

      const state = useCollectionStore.getState();
      assert.equal(state.expandedCollectionIds['col-auth'], true);
      assert.equal(state.expandedFolderIds['folder-oauth'], true);
      assert.equal(state.expandedFolderIds['folder-v2'], true);
    });
  });

  describe('4. Canvas Layout & Position Retention', () => {
    it('serializes and deserializes canvas preserving custom node coordinates', () => {
      const customNode = requestToNode(
        { id: 'req-layout-1', name: 'Layout Req', method: 'GET', url: '/test', collectionId },
        { x: 450, y: 320 },
        'Test Col',
        'Subfolder'
      );

      useCanvasStore.getState().setNodes([customNode]);

      const serialized = serializeCanvas(
        useCanvasStore.getState().nodes,
        useCanvasStore.getState().edges,
        { x: 10, y: 20, zoom: 1.2 }
      );

      assert.equal(serialized.nodes[0].position.x, 450);
      assert.equal(serialized.nodes[0].position.y, 320);

      // Deserializing against available requests
      const available = [
        { id: 'req-layout-1', name: 'Layout Req', method: 'GET', url: '/test', collectionId },
      ];
      const collections = [{ id: collectionId, name: 'Test Col' }];

      const restored = deserializeCanvas(serialized, available, collections);
      assert.ok(restored);
      assert.equal(restored.nodes.length, 1);
      assert.equal(restored.nodes[0].position.x, 450);
      assert.equal(restored.nodes[0].position.y, 320);
      assert.equal(restored.nodes[0].data.breadcrumb, 'Test Col');
    });

    it('computes deterministic multi-collection grid layout', () => {
      const requests = [
        { id: 'r1', name: 'R1', collectionId: 'c1', method: 'GET' },
        { id: 'r2', name: 'R2', collectionId: 'c1', method: 'POST' },
        { id: 'r3', name: 'R3', collectionId: 'c2', method: 'GET' },
      ];
      const collections = [
        { id: 'c1', name: 'Auth API' },
        { id: 'c2', name: 'Users API' },
      ];

      const { nodes } = computeDeterministicLayout(requests, collections);
      assert.equal(nodes.length, 3);

      // Verify node c2 is placed below c1
      const c1Nodes = nodes.filter((n) => n.data.collectionId === 'c1');
      const c2Nodes = nodes.filter((n) => n.data.collectionId === 'c2');
      assert.equal(c1Nodes.length, 2);
      assert.equal(c2Nodes.length, 1);
      assert.ok(c2Nodes[0].position.y > c1Nodes[0].position.y);
    });
  });

  describe('5. Dirty State & Workspace Tabs Isolation', () => {
    it('preserves tab dirty flag across workspace tab management', () => {
      const tabStore = useRequestTabStore.getState();

      tabStore.openTab({
        workspaceId,
        collectionId,
        requestId: 'req-dirty-1',
        title: 'Dirty Tab',
        isDirty: true,
      });

      const tab = tabStore.getActiveTab(workspaceId);
      assert.equal(tab.isDirty, true);

      tabStore.setTabDirty(workspaceId, 'req-dirty-1', false);
      const cleanedTab = tabStore.getActiveTab(workspaceId);
      assert.equal(cleanedTab.isDirty, false);
    });
  });
});
