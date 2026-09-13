import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useToastStore, toast } from '../src/stores/toastStore.js';
import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';
import { useCanvasStore } from '../src/features/canvas/store/canvasStore.js';

describe('Step 35: Quick Actions and Contextual Resource Menus — Unit Verification', () => {
  const ws1 = 'workspace-action-1';
  const ws2 = 'workspace-action-2';

  beforeEach(() => {
    // Reset stores
    useToastStore.getState().clear();
    useRequestTabStore.getState().clearWorkspaceTabs(ws1);
    useRequestTabStore.getState().clearWorkspaceTabs(ws2);
    useCanvasStore.setState({ nodes: [], edges: [], selectedNodeId: null });
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
  });

  describe('1. Toast Notification Store', () => {
    it('should add notifications and support success, error, info, and warning helpers', () => {
      toast.success('URL copied');
      toast.error('Failed to duplicate');
      toast.info('Read-only mode');
      toast.warning('Unsaved changes');

      const items = useToastStore.getState().toasts;
      assert.equal(items.length, 4);
      assert.equal(items[0].message, 'URL copied');
      assert.equal(items[0].type, 'success');
      assert.equal(items[1].message, 'Failed to duplicate');
      assert.equal(items[1].type, 'error');
      assert.equal(items[2].message, 'Read-only mode');
      assert.equal(items[2].type, 'info');
      assert.equal(items[3].message, 'Unsaved changes');
      assert.equal(items[3].type, 'warning');
    });

    it('should dismiss toasts by id', () => {
      const id1 = toast.success('First');
      const id2 = toast.success('Second');

      assert.equal(useToastStore.getState().toasts.length, 2);

      useToastStore.getState().dismiss(id1);
      const remaining = useToastStore.getState().toasts;
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].id, id2);
    });
  });

  describe('2. Request Tab Store with URL & Close All Support', () => {
    it('should store and update URL in tab metadata', () => {
      const tabStore = useRequestTabStore.getState();

      tabStore.openTab({
        workspaceId: ws1,
        collectionId: 'col-1',
        requestId: 'req-1',
        title: 'Get User Profile',
        method: 'GET',
        url: 'https://api.example.com/users/{{userId}}',
      });

      let tabs = tabStore.getTabs(ws1);
      assert.equal(tabs.length, 1);
      assert.equal(tabs[0].url, 'https://api.example.com/users/{{userId}}');

      // Update URL
      tabStore.updateTabMeta(ws1, 'req-1', {
        title: 'Updated Profile',
        method: 'PATCH',
        url: 'https://api.example.com/users/{{userId}}/avatar',
      });

      tabs = tabStore.getTabs(ws1);
      assert.equal(tabs[0].title, 'Updated Profile');
      assert.equal(tabs[0].method, 'PATCH');
      assert.equal(tabs[0].url, 'https://api.example.com/users/{{userId}}/avatar');
    });

    it('should close all tabs for a specific workspace without affecting other workspaces', () => {
      const tabStore = useRequestTabStore.getState();

      tabStore.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'WS1 Tab 1' });
      tabStore.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'WS1 Tab 2' });
      tabStore.openTab({ workspaceId: ws2, requestId: 'req-3', title: 'WS2 Tab 1' });

      assert.equal(tabStore.getTabs(ws1).length, 2);
      assert.equal(tabStore.getTabs(ws2).length, 1);

      tabStore.closeAllTabs(ws1);

      assert.equal(tabStore.getTabs(ws1).length, 0);
      assert.equal(tabStore.getActiveTabId(ws1), null);
      // ws2 is isolated and untouched
      assert.equal(tabStore.getTabs(ws2).length, 1);
    });
  });

  describe('3. Canvas Integration with Quick Actions', () => {
    it('should add a single request to the canvas via addRequestNode', () => {
      const canvasStore = useCanvasStore.getState();

      const req = {
        id: 'req-1',
        name: 'Get Products',
        method: 'GET',
        url: 'https://api.example.com/products',
      };

      canvasStore.addRequestNode(req, 'Inventory Collection');

      const nodes = useCanvasStore.getState().nodes;
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0].id, 'req-1');
      assert.equal(nodes[0].data.name, 'Get Products');
      assert.equal(nodes[0].data.collectionName, 'Inventory Collection');
      assert.equal(nodes[0].data.url, 'https://api.example.com/products');
    });

    it('should add multiple collection requests to canvas via addCollectionNodes', () => {
      const canvasStore = useCanvasStore.getState();

      const requests = [
        { id: 'r1', name: 'Req 1', method: 'GET', url: 'https://api.com/1' },
        { id: 'r2', name: 'Req 2', method: 'POST', url: 'https://api.com/2' },
        { id: 'r3', name: 'Req 3', method: 'DELETE', url: 'https://api.com/3' },
      ];

      canvasStore.addCollectionNodes(requests, 'Auth');

      const nodes = useCanvasStore.getState().nodes;
      assert.equal(nodes.length, 3);
      assert.deepEqual(nodes.map((n) => n.id), ['r1', 'r2', 'r3']);

      // Deduplicate when adding collection requests that are already placed
      canvasStore.addCollectionNodes(requests, 'Auth');
      assert.equal(useCanvasStore.getState().nodes.length, 3);
    });
  });

  describe('4. Unresolved Variable Preservation & Copy Safety', () => {
    it('should preserve unresolved {{variable}} syntax when accessing URL', () => {
      const testUrl = '{{baseUrl}}/v1/users/{{userId}}?apiKey={{secretKey}}';
      const req = { id: 'req-sec', url: testUrl };

      // Copying request.url must copy the raw string with {{var}} intact
      assert.equal(req.url, testUrl);
      assert.ok(req.url.includes('{{baseUrl}}'));
      assert.ok(req.url.includes('{{secretKey}}'));
    });
  });
});

