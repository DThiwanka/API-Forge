import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';

describe('Step 31: Multi-Request Tab System — Unit Verification', () => {
  const ws1 = 'workspace-alpha';
  const ws2 = 'workspace-beta';

  beforeEach(() => {
    useRequestTabStore.getState().clearWorkspaceTabs(ws1);
    useRequestTabStore.getState().clearWorkspaceTabs(ws2);
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

  describe('1. Tab Opening, Ordering & Deduplication', () => {
    it('should open new tabs and append them to the right in deterministic order', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Login', method: 'POST' });
      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-2', title: 'Get Users', method: 'GET' });
      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-3', title: 'Create Order', method: 'PUT' });

      const tabs = useRequestTabStore.getState().getTabs(ws1);
      assert.equal(tabs.length, 3);
      assert.deepEqual(tabs.map((t) => t.requestId), ['req-1', 'req-2', 'req-3']);
      assert.deepEqual(tabs.map((t) => t.method), ['POST', 'GET', 'PUT']);
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-3');
    });

    it('should deduplicate tabs when opening an already-opened request without reordering', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Login', method: 'POST' });
      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-2', title: 'Get Profile', method: 'GET' });
      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-3', title: 'Get Orders', method: 'GET' });

      // Re-open req-1: should not create a 4th tab, should retain position at index 0, and make req-1 active
      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Login Updated', method: 'POST' });

      const tabs = useRequestTabStore.getState().getTabs(ws1);
      assert.equal(tabs.length, 3);
      assert.deepEqual(tabs.map((t) => t.requestId), ['req-1', 'req-2', 'req-3']);
      assert.equal(tabs[0].title, 'Login Updated');
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-1');
    });

    it('should update tab metadata (title and method) on live edits', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Initial Title', method: 'GET' });
      store.updateTabMeta(ws1, 'req-1', { title: 'Renamed Title', method: 'patch' });

      const tab = useRequestTabStore.getState().getTabs(ws1)[0];
      assert.equal(tab.title, 'Renamed Title');
      assert.equal(tab.method, 'PATCH');
    });
  });

  describe('2. Tab Switching & Activation History', () => {
    it('should maintain an activation history stack when switching active tabs', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });
      store.openTab({ workspaceId: ws1, requestId: 'req-3', title: 'Tab 3' });

      assert.equal(store.getActiveTabId(ws1), 'req-3');

      // Switch to Tab 1, then Tab 2
      store.setActiveTab(ws1, 'req-1');
      assert.equal(store.getActiveTabId(ws1), 'req-1');

      store.setActiveTab(ws1, 'req-2');
      assert.equal(store.getActiveTabId(ws1), 'req-2');

      const history = useRequestTabStore.getState().historyByWorkspace[ws1];
      assert.deepEqual(history, ['req-3', 'req-1', 'req-2']);
    });
  });

  describe('3. Deterministic Tab Closure & Next-Tab Resolution', () => {
    it('should keep active tab unchanged when closing an inactive tab', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });
      store.openTab({ workspaceId: ws1, requestId: 'req-3', title: 'Tab 3' });

      // req-3 is active. Close inactive req-2
      const { nextTab, closedTab } = store.closeTab(ws1, 'req-2');

      assert.equal(closedTab.requestId, 'req-2');
      assert.equal(nextTab.requestId, 'req-3');
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-3');
      assert.deepEqual(useRequestTabStore.getState().getTabs(ws1).map((t) => t.requestId), ['req-1', 'req-3']);
    });

    it('should resolve next active tab from history stack when closing active tab', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });
      store.openTab({ workspaceId: ws1, requestId: 'req-3', title: 'Tab 3' });

      // History: [req-1, req-2, req-3]
      // Switch to req-1: History becomes [req-2, req-3, req-1]
      store.setActiveTab(ws1, 'req-1');

      // Now close active req-1. Most recent in history before req-1 was req-3!
      const { nextTab } = store.closeTab(ws1, 'req-1');

      assert.equal(nextTab.requestId, 'req-3');
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-3');
    });

    it('should fallback to adjacent tab if no history exists when closing active tab', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });
      store.openTab({ workspaceId: ws1, requestId: 'req-3', title: 'Tab 3' });

      // Clear history artificially to test adjacent fallback
      useRequestTabStore.setState((s) => ({
        historyByWorkspace: { ...s.historyByWorkspace, [ws1]: [] },
      }));

      // Close req-2 (middle tab). Fallback index should be 1 (which becomes req-3)
      const { nextTab } = store.closeTab(ws1, 'req-2');
      assert.equal(nextTab.requestId, 'req-3');
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-3');
    });

    it('should resolve to left adjacent tab when closing the rightmost active tab with no history', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });

      // Clear history artificially
      useRequestTabStore.setState((s) => ({
        historyByWorkspace: { ...s.historyByWorkspace, [ws1]: [] },
      }));

      // Close req-2 (last tab). Fallback index should be Math.min(1, 0) = 0 -> req-1
      const { nextTab } = store.closeTab(ws1, 'req-2');
      assert.equal(nextTab.requestId, 'req-1');
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-1');
    });

    it('should resolve nextTab to null when closing the last remaining tab', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-only', title: 'Only Tab' });
      const { nextTab, closedTab } = store.closeTab(ws1, 'req-only');

      assert.equal(closedTab.requestId, 'req-only');
      assert.equal(nextTab, null);
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), null);
      assert.equal(useRequestTabStore.getState().getTabs(ws1).length, 0);
    });
  });

  describe('4. Bulk Tab Operations (Close Others & Close to Right)', () => {
    it('should close all other tabs and keep target active for closeOtherTabs', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });
      store.openTab({ workspaceId: ws1, requestId: 'req-3', title: 'Tab 3' });
      store.openTab({ workspaceId: ws1, requestId: 'req-4', title: 'Tab 4' });

      const closed = store.closeOtherTabs(ws1, 'req-2');

      assert.equal(closed.length, 3);
      assert.deepEqual(closed.map((t) => t.requestId), ['req-1', 'req-3', 'req-4']);

      const remaining = useRequestTabStore.getState().getTabs(ws1);
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].requestId, 'req-2');
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-2');
    });

    it('should close all tabs to the right of target for closeTabsToRight', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'req-1', title: 'Tab 1' });
      store.openTab({ workspaceId: ws1, requestId: 'req-2', title: 'Tab 2' });
      store.openTab({ workspaceId: ws1, requestId: 'req-3', title: 'Tab 3' });
      store.openTab({ workspaceId: ws1, requestId: 'req-4', title: 'Tab 4' });

      // req-4 is currently active. Close tabs to right of req-2
      const closed = store.closeTabsToRight(ws1, 'req-2');

      assert.equal(closed.length, 2);
      assert.deepEqual(closed.map((t) => t.requestId), ['req-3', 'req-4']);

      const remaining = useRequestTabStore.getState().getTabs(ws1);
      assert.deepEqual(remaining.map((t) => t.requestId), ['req-1', 'req-2']);
      // Because active tab (req-4) was closed, active falls back to req-2
      assert.equal(useRequestTabStore.getState().getActiveTabId(ws1), 'req-2');
    });
  });

  describe('5. Workspace Scoping & Isolation', () => {
    it('should strictly isolate tabs, active selection, and history between different workspaces', () => {
      const store = useRequestTabStore.getState();

      store.openTab({ workspaceId: ws1, requestId: 'ws1-req-1', title: 'WS1 Req' });
      store.openTab({ workspaceId: ws2, requestId: 'ws2-req-A', title: 'WS2 Req A' });
      store.openTab({ workspaceId: ws2, requestId: 'ws2-req-B', title: 'WS2 Req B' });

      const tabs1 = store.getTabs(ws1);
      const tabs2 = store.getTabs(ws2);

      assert.equal(tabs1.length, 1);
      assert.equal(tabs1[0].requestId, 'ws1-req-1');

      assert.equal(tabs2.length, 2);
      assert.deepEqual(tabs2.map((t) => t.requestId), ['ws2-req-A', 'ws2-req-B']);

      assert.equal(store.getActiveTabId(ws1), 'ws1-req-1');
      assert.equal(store.getActiveTabId(ws2), 'ws2-req-B');

      // Closing a tab in ws2 does not affect ws1
      store.closeTab(ws2, 'ws2-req-B');
      assert.equal(store.getTabs(ws1).length, 1);
      assert.equal(store.getActiveTabId(ws1), 'ws1-req-1');
      assert.equal(store.getActiveTabId(ws2), 'ws2-req-A');
    });
  });

  describe('6. Per-Request Draft Preservation & Dirty Tracking in requestStore', () => {
    it('should snapshot in-progress edits into drafts when switching tabs and restore them seamlessly', () => {
      const tabStore = useRequestTabStore.getState();
      const reqStore = useRequestStore.getState();

      // 1. Open req-1 and load into requestStore
      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Get Users', method: 'GET' });
      reqStore.loadRequest(
        { id: 'req-1', workspaceId: ws1, collectionId: 'col-1', name: 'Get Users', method: 'GET', url: 'https://api.com/users' },
        ws1,
        'col-1'
      );

      // Verify clean initial state
      assert.equal(useRequestStore.getState().isDirty, false);

      // 2. Modify req-1 (URL and Name)
      useRequestStore.getState().setUrl('https://api.com/users?role=admin');
      useRequestStore.getState().setName('Get Admin Users');

      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestStore.getState().url, 'https://api.com/users?role=admin');
      assert.equal(useRequestStore.getState().name, 'Get Admin Users');

      // Tab bar should reflect dirty status and updated title
      const tab1 = useRequestTabStore.getState().getTabs(ws1)[0];
      assert.equal(tab1.isDirty, true);
      assert.equal(tab1.title, 'Get Admin Users');

      // 3. Switch to req-2: req-1 draft should be snapshotted
      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-2', title: 'Create User', method: 'POST' });
      useRequestStore.getState().loadRequest(
        { id: 'req-2', workspaceId: ws1, collectionId: 'col-1', name: 'Create User', method: 'POST', url: 'https://api.com/users' },
        ws1,
        'col-1'
      );

      // req-2 is now loaded and clean
      assert.equal(useRequestStore.getState().id, 'req-2');
      assert.equal(useRequestStore.getState().isDirty, false);
      assert.equal(useRequestStore.getState().url, 'https://api.com/users');

      // Draft for req-1 must be stored in drafts dictionary
      const drafts = useRequestStore.getState().drafts;
      assert.ok(drafts['req-1'], 'req-1 draft should exist in drafts');
      assert.equal(drafts['req-1'].url, 'https://api.com/users?role=admin');
      assert.equal(drafts['req-1'].name, 'Get Admin Users');
      assert.equal(drafts['req-1'].isDirty, true);

      // 4. Switch back to req-1: draft must be restored with all unsaved edits
      tabStore.setActiveTab(ws1, 'req-1');
      useRequestStore.getState().loadRequest(
        { id: 'req-1', workspaceId: ws1, collectionId: 'col-1', name: 'Get Users', method: 'GET', url: 'https://api.com/users' },
        ws1,
        'col-1'
      );

      assert.equal(useRequestStore.getState().id, 'req-1');
      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestStore.getState().url, 'https://api.com/users?role=admin');
      assert.equal(useRequestStore.getState().name, 'Get Admin Users');
    });

    it('should discard draft and reset dirty state when clearDraft is invoked', () => {
      const tabStore = useRequestTabStore.getState();
      const reqStore = useRequestStore.getState();

      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Req 1', method: 'GET' });
      reqStore.loadRequest({ id: 'req-1', workspaceId: ws1, collectionId: 'col-1', name: 'Req 1', method: 'GET', url: 'https://api.com' }, ws1, 'col-1');

      // Edit to make dirty
      useRequestStore.getState().setUrl('https://api.com/modified');
      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestTabStore.getState().getTabs(ws1)[0].isDirty, true);

      // Discard draft
      useRequestStore.getState().clearDraft('req-1');

      assert.equal(useRequestStore.getState().isDirty, false);
      assert.equal(useRequestStore.getState().drafts['req-1'], undefined);
      assert.equal(useRequestTabStore.getState().getTabs(ws1)[0].isDirty, false);
    });
  });
});

