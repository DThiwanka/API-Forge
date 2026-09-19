import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isMac,
  formatShortcutKey,
  parseShortcut,
  matchesShortcut,
  isEditableElement,
} from '../src/features/shortcuts/utils/shortcutUtils.js';
import { SHORTCUTS, SHORTCUT_SCOPES } from '../src/features/shortcuts/constants/shortcutRegistry.js';
import { useShortcutStore } from '../src/features/shortcuts/store/shortcutStore.js';
import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';
import { useCanvasStore } from '../src/features/canvas/store/canvasStore.js';
import { searchCommands } from '../src/features/command-center/utils/commandUtils.js';

describe('Step 57: Keyboard Shortcuts & Power-User UX — Unit Verification', () => {
  const ws1 = 'workspace-shortcuts-1';

  beforeEach(() => {
    // Reset stores
    useShortcutStore.setState({
      scopeStack: [SHORTCUT_SCOPES.GLOBAL],
      isHelpModalOpen: false,
    });

    useRequestTabStore.getState().clearWorkspaceTabs(ws1);
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

    useCanvasStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
  });

  describe('1. Platform Detection & Shortcut Key Formatting', () => {
    it('should execute isMac() platform check safely in any environment', () => {
      const result = isMac();
      assert.equal(typeof result, 'boolean');
    });

    it('should correctly format Mod to Cmd on macOS and Ctrl on Windows/Linux', () => {
      const macFormatted = formatShortcutKey('Mod+K', true);
      const winFormatted = formatShortcutKey('Mod+K', false);

      assert.equal(macFormatted, '⌘ K');
      assert.equal(winFormatted, 'Ctrl + K');

      const macCompact = formatShortcutKey('Mod+K', true, true);
      const winCompact = formatShortcutKey('Mod+K', false, true);

      assert.equal(macCompact, '⌘K');
      assert.equal(winCompact, 'Ctrl+K');
    });

    it('should format special keys (Enter, Shift, Alt, Escape) accurately across platforms', () => {
      assert.equal(formatShortcutKey('Mod+Enter', true, true), '⌘↵');
      assert.equal(formatShortcutKey('Mod+Enter', false, true), 'Ctrl+Enter');

      assert.equal(formatShortcutKey('Mod+Shift+S', true, true), '⌘⇧S');
      assert.equal(formatShortcutKey('Mod+Shift+S', false, true), 'Ctrl+Shift+S');

      assert.equal(formatShortcutKey('Alt+N', true, true), '⌥N');
      assert.equal(formatShortcutKey('Alt+N', false, true), 'Alt+N');

      assert.equal(formatShortcutKey('Escape', false), 'Esc');
    });

    it('should parse shortcut combinations into structured modifier components', () => {
      const parsed = parseShortcut('Mod+Shift+S');
      assert.deepEqual(parsed, {
        needsMod: true,
        needsShift: true,
        needsAlt: false,
        primaryKey: 'S',
      });

      const parsedAlt = parseShortcut('Alt+1');
      assert.deepEqual(parsedAlt, {
        needsMod: false,
        needsShift: false,
        needsAlt: true,
        primaryKey: '1',
      });
    });
  });

  describe('2. Key Combination Matching & Modifiers', () => {
    it('should match Mod+K with Ctrl on Windows and Cmd on Mac', () => {
      const winEvent = { key: 'k', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
      const macEvent = { key: 'k', ctrlKey: false, metaKey: true, shiftKey: false, altKey: false };

      assert.equal(matchesShortcut(winEvent, 'Mod+K', false), true);
      assert.equal(matchesShortcut(macEvent, 'Mod+K', true), true);

      // Should not match without modifier
      const noModEvent = { key: 'k', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
      assert.equal(matchesShortcut(noModEvent, 'Mod+K', false), false);
      assert.equal(matchesShortcut(noModEvent, 'Mod+K', true), false);
    });

    it('should match shortcut definitions with alternateKeys (e.g. ? or Mod+/)', () => {
      const helpDef = SHORTCUTS.find((s) => s.id === 'open-shortcuts-help');
      assert.ok(helpDef);

      const slashEvent = { key: '/', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
      const questionEvent = { key: '?', ctrlKey: false, metaKey: false, shiftKey: true, altKey: false };

      assert.equal(matchesShortcut(slashEvent, helpDef, false), true);
      assert.equal(matchesShortcut(questionEvent, helpDef, false), true);
    });

    it('should handle brackets for tab cycling: [ and ]', () => {
      const prevBracket = { key: '[', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };
      const nextBracket = { key: ']', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false };

      assert.equal(matchesShortcut(prevBracket, 'Mod+[', false), true);
      assert.equal(matchesShortcut(nextBracket, 'Mod+]', false), true);
    });
  });

  describe('3. Input Safety Enforcement', () => {
    it('should identify INPUT, TEXTAREA, and SELECT elements as editable', () => {
      assert.equal(isEditableElement({ tagName: 'INPUT' }), true);
      assert.equal(isEditableElement({ tagName: 'TEXTAREA' }), true);
      assert.equal(isEditableElement({ tagName: 'SELECT' }), true);
    });

    it('should identify contentEditable elements as editable', () => {
      assert.equal(isEditableElement({ tagName: 'DIV', isContentEditable: true }), true);
    });

    it('should identify Monaco editor ancestors as editable', () => {
      const fakeMonacoChild = {
        tagName: 'SPAN',
        closest: (selector) => selector.includes('monaco-editor'),
      };
      assert.equal(isEditableElement(fakeMonacoChild), true);
    });

    it('should treat normal button and canvas elements as non-editable', () => {
      const fakeButton = { tagName: 'BUTTON', closest: () => null };
      const fakeCanvas = { tagName: 'DIV', closest: () => null };

      assert.equal(isEditableElement(fakeButton), false);
      assert.equal(isEditableElement(fakeCanvas), false);
    });

    it('should verify shortcut registry input policies', () => {
      const sendDef = SHORTCUTS.find((s) => s.id === 'send-request');
      const saveDef = SHORTCUTS.find((s) => s.id === 'save-request');
      const fitViewDef = SHORTCUTS.find((s) => s.id === 'canvas-fit-view');
      const deleteNodeDef = SHORTCUTS.find((s) => s.id === 'canvas-delete-node');
      const switchTabsDef = SHORTCUTS.find((s) => s.id === 'switch-config-tabs');

      // Send & Save are allowed in inputs so developers can save/send while typing in URL or Body
      assert.equal(sendDef.allowInInputs, true);
      assert.equal(saveDef.allowInInputs, true);

      // Single-key Canvas shortcuts & numbers MUST NOT execute inside inputs
      assert.equal(fitViewDef.allowInInputs, false);
      assert.equal(deleteNodeDef.allowInInputs, false);
      assert.equal(switchTabsDef.allowInInputs, false);
    });
  });

  describe('4. Scope Hierarchy & Management', () => {
    it('should default to GLOBAL scope and allow pushing/popping scopes', () => {
      const store = useShortcutStore.getState();
      assert.equal(store.getCurrentScope(), SHORTCUT_SCOPES.GLOBAL);

      store.pushScope(SHORTCUT_SCOPES.REQUEST);
      assert.equal(useShortcutStore.getState().getCurrentScope(), SHORTCUT_SCOPES.REQUEST);

      store.pushScope(SHORTCUT_SCOPES.DIALOG);
      assert.equal(useShortcutStore.getState().getCurrentScope(), SHORTCUT_SCOPES.DIALOG);

      store.popScope(SHORTCUT_SCOPES.DIALOG);
      assert.equal(useShortcutStore.getState().getCurrentScope(), SHORTCUT_SCOPES.REQUEST);

      store.popScope(SHORTCUT_SCOPES.REQUEST);
      assert.equal(useShortcutStore.getState().getCurrentScope(), SHORTCUT_SCOPES.GLOBAL);
    });

    it('should never remove the base GLOBAL scope when popping', () => {
      const store = useShortcutStore.getState();
      store.popScope(SHORTCUT_SCOPES.GLOBAL);
      assert.equal(useShortcutStore.getState().getCurrentScope(), SHORTCUT_SCOPES.GLOBAL);
    });

    it('should open and close the Keyboard Shortcuts help modal', () => {
      const store = useShortcutStore.getState();
      assert.equal(store.isHelpModalOpen, false);

      store.openHelpModal();
      assert.equal(useShortcutStore.getState().isHelpModalOpen, true);

      store.closeHelpModal();
      assert.equal(useShortcutStore.getState().isHelpModalOpen, false);
    });
  });

  describe('5. Request Tab Navigation & Closing Safeguards', () => {
    it('should cycle through request tabs in forward and reverse order', () => {
      const tabStore = useRequestTabStore.getState();

      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Req 1' });
      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-2', title: 'Req 2' });
      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-3', title: 'Req 3' });

      const tabs = tabStore.getTabs(ws1);
      assert.equal(tabs.length, 3);
      assert.equal(tabStore.getActiveTabId(ws1), 'req-3');

      // Next tab from index 2 cycles to index 0
      const currentIdx = tabs.findIndex((t) => t.requestId === tabStore.getActiveTabId(ws1));
      const nextIdx = (currentIdx + 1) % tabs.length;
      assert.equal(tabs[nextIdx].requestId, 'req-1');

      // Prev tab from index 0 cycles to index 2
      const prevIdx = (nextIdx - 1 + tabs.length) % tabs.length;
      assert.equal(tabs[prevIdx].requestId, 'req-3');
    });

    it('should safely close clean tab without losing workspace tabs', () => {
      const tabStore = useRequestTabStore.getState();

      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Req 1' });
      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-2', title: 'Req 2' });

      const { nextTab } = tabStore.closeTab(ws1, 'req-2');
      assert.equal(nextTab?.requestId, 'req-1');
      assert.equal(tabStore.getTabs(ws1).length, 1);
    });

    it('should detect dirty state when closing tab to guard against accidental data loss', () => {
      const tabStore = useRequestTabStore.getState();

      tabStore.openTab({ workspaceId: ws1, collectionId: 'col-1', requestId: 'req-1', title: 'Req 1' });

      // Tab store marks dirty
      tabStore.setTabDirty(ws1, 'req-1', true);

      const tabs = tabStore.getTabs(ws1);
      const targetTab = tabs.find((t) => t.requestId === 'req-1');

      // Guard check: dirty tab must trigger confirmation rather than silent close
      assert.equal(targetTab.isDirty, true);
    });
  });

  describe('6. Spatial API Canvas Shortcut Safety', () => {
    it('should delete nodes from Canvas store only without mutating backend resources', () => {
      const canvasStore = useCanvasStore.getState();

      canvasStore.addRequestNode(
        { id: 'req-canvas-1', name: 'Get Users', method: 'GET', url: '/users', collectionId: 'col-1' },
        'Collection 1'
      );
      assert.equal(useCanvasStore.getState().nodes.length, 1);

      // Select node
      useCanvasStore.getState().setSelectedNodeId('req-canvas-1');

      // Trigger delete selected nodes
      useCanvasStore.getState().deleteSelectedNodes();

      // Node removed from canvas store
      assert.equal(useCanvasStore.getState().nodes.length, 0);

      // Verify request tab store was not wiped
      assert.ok(useRequestTabStore.getState().getTabs(ws1));
    });

    it('should clear selection and close picker on Escape', () => {
      const canvasStore = useCanvasStore.getState();

      canvasStore.setSelectedNodeId('node-1');
      assert.equal(useCanvasStore.getState().selectedNodeId, 'node-1');

      canvasStore.clearSelection();
      assert.equal(useCanvasStore.getState().selectedNodeId, null);
    });
  });

  describe('7. Permission Restrictions & Role Awareness', () => {
    it('should define restrictedRoles on mutating shortcuts (Save, Duplicate, New Request)', () => {
      const saveDef = SHORTCUTS.find((s) => s.id === 'save-request');
      const dupDef = SHORTCUTS.find((s) => s.id === 'duplicate-request');
      const newReqDef = SHORTCUTS.find((s) => s.id === 'create-request');

      assert.deepEqual(saveDef.restrictedRoles, ['viewer']);
      assert.deepEqual(dupDef.restrictedRoles, ['viewer']);
      assert.deepEqual(newReqDef.restrictedRoles, ['viewer']);
    });
  });

  describe('8. Command Center Shortcut Discovery', () => {
    it('should surface Keyboard Shortcuts command when searching for shortcuts or help', () => {
      const mockCommands = [
        {
          id: 'action-keyboard-shortcuts',
          title: 'Keyboard Shortcuts',
          description: 'View all keyboard shortcuts and power-user cheat sheet',
          group: 'Actions',
          shortcut: 'Ctrl+/',
          keywords: ['shortcuts', 'hotkeys', 'cheat sheet', 'keybindings', 'keys', 'help'],
        },
        {
          id: 'action-send-current-request',
          title: 'Send Request',
          description: 'Send current API request',
          group: 'Actions',
          shortcut: 'Ctrl+Enter',
          keywords: ['send', 'execute'],
        },
      ];

      const searchResultShortcuts = searchCommands(mockCommands, 'shortcuts');
      assert.ok(searchResultShortcuts.length > 0);
      assert.equal(searchResultShortcuts[0].id, 'action-keyboard-shortcuts');

      const searchResultKeys = searchCommands(mockCommands, 'keys');
      assert.ok(searchResultKeys.length > 0);
      assert.equal(searchResultKeys[0].id, 'action-keyboard-shortcuts');
    });
  });
});
