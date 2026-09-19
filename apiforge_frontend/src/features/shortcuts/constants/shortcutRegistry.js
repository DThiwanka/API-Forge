/**
 * Canonical Keyboard Shortcut Registry for APIForge
 * Defines all built-in shortcuts, their default keys, scopes, categories, and input policies.
 */

export const SHORTCUT_SCOPES = {
  GLOBAL: 'global',
  REQUEST: 'request',
  CANVAS: 'canvas',
  BROWSER: 'browser',
  DIALOG: 'dialog',
};

export const SHORTCUT_CATEGORIES = {
  GENERAL: 'General',
  REQUEST: 'Request Workspace',
  TABS: 'Tab Navigation',
  CANVAS: 'Spatial API Canvas',
  BROWSER: 'Browser Space',
  DIALOGS: 'Dialogs & Modals',
};

export const SHORTCUTS = [
  // --- General & Global ---
  {
    id: 'open-command-center',
    label: 'Command Center',
    description: 'Search requests, collections, history, and actions',
    keys: 'Mod+K',
    scope: SHORTCUT_SCOPES.GLOBAL,
    category: SHORTCUT_CATEGORIES.GENERAL,
    allowInInputs: true,
  },
  {
    id: 'open-shortcuts-help',
    label: 'Keyboard Shortcuts',
    description: 'View all keyboard shortcuts and cheat sheet',
    keys: 'Mod+/',
    alternateKeys: ['?'],
    scope: SHORTCUT_SCOPES.GLOBAL,
    category: SHORTCUT_CATEGORIES.GENERAL,
    allowInInputs: false,
  },
  {
    id: 'create-request',
    label: 'New Request',
    description: 'Create a new API request in current workspace',
    keys: 'Alt+N',
    alternateKeys: ['Mod+Alt+N'],
    scope: SHORTCUT_SCOPES.GLOBAL,
    category: SHORTCUT_CATEGORIES.GENERAL,
    allowInInputs: false,
    restrictedRoles: ['viewer'],
  },
  {
    id: 'close-active-overlay',
    label: 'Close Active Overlay',
    description: 'Close active dialog, modal, dropdown, or command palette',
    keys: 'Escape',
    scope: SHORTCUT_SCOPES.GLOBAL,
    category: SHORTCUT_CATEGORIES.GENERAL,
    allowInInputs: true,
  },

  // --- Request Workspace ---
  {
    id: 'send-request',
    label: 'Send Request',
    description: 'Execute the active API request',
    keys: 'Mod+Enter',
    scope: SHORTCUT_SCOPES.REQUEST,
    category: SHORTCUT_CATEGORIES.REQUEST,
    allowInInputs: true,
  },
  {
    id: 'save-request',
    label: 'Save Request',
    description: 'Save modifications to the active request',
    keys: 'Mod+S',
    scope: SHORTCUT_SCOPES.REQUEST,
    category: SHORTCUT_CATEGORIES.REQUEST,
    allowInInputs: true,
    restrictedRoles: ['viewer'],
  },
  {
    id: 'duplicate-request',
    label: 'Duplicate Request',
    description: 'Create a duplicate copy of the active request',
    keys: 'Mod+Shift+S',
    scope: SHORTCUT_SCOPES.REQUEST,
    category: SHORTCUT_CATEGORIES.REQUEST,
    allowInInputs: true,
    restrictedRoles: ['viewer'],
  },
  {
    id: 'focus-request-url',
    label: 'Focus URL Bar',
    description: 'Focus and select the request URL input',
    keys: 'Mod+L',
    alternateKeys: ['Alt+D'],
    scope: SHORTCUT_SCOPES.REQUEST,
    category: SHORTCUT_CATEGORIES.REQUEST,
    allowInInputs: true,
  },
  {
    id: 'switch-config-tabs',
    label: 'Switch Config Subtabs',
    description: 'Jump directly to Params (1), Headers (2), Auth (3), Body (4), Settings (5), Tests (6)',
    keys: 'Alt+1..6',
    scope: SHORTCUT_SCOPES.REQUEST,
    category: SHORTCUT_CATEGORIES.REQUEST,
    allowInInputs: false,
  },

  // --- Tab Navigation ---
  {
    id: 'close-request-tab',
    label: 'Close Active Tab',
    description: 'Close active request tab (confirms if dirty)',
    keys: 'Mod+W',
    scope: SHORTCUT_SCOPES.TABS,
    category: SHORTCUT_CATEGORIES.TABS,
    allowInInputs: true,
  },
  {
    id: 'next-request-tab',
    label: 'Next Request Tab',
    description: 'Cycle to the next open request tab',
    keys: 'Mod+]',
    alternateKeys: ['Mod+Shift+]'],
    scope: SHORTCUT_SCOPES.TABS,
    category: SHORTCUT_CATEGORIES.TABS,
    allowInInputs: false,
  },
  {
    id: 'prev-request-tab',
    label: 'Previous Request Tab',
    description: 'Cycle to the previous open request tab',
    keys: 'Mod+[',
    alternateKeys: ['Mod+Shift+['],
    scope: SHORTCUT_SCOPES.TABS,
    category: SHORTCUT_CATEGORIES.TABS,
    allowInInputs: false,
  },

  // --- Spatial API Canvas ---
  {
    id: 'canvas-fit-view',
    label: 'Focus / Fit View',
    description: 'Center selected node or fit all nodes into view',
    keys: 'F',
    scope: SHORTCUT_SCOPES.CANVAS,
    category: SHORTCUT_CATEGORIES.CANVAS,
    allowInInputs: false,
  },
  {
    id: 'canvas-delete-node',
    label: 'Remove Node from Canvas',
    description: 'Remove selected node from Canvas (does not delete request)',
    keys: 'Delete',
    alternateKeys: ['Backspace'],
    scope: SHORTCUT_SCOPES.CANVAS,
    category: SHORTCUT_CATEGORIES.CANVAS,
    allowInInputs: false,
  },
  {
    id: 'canvas-select-all',
    label: 'Select All Nodes',
    description: 'Select all nodes on the active Canvas',
    keys: 'Mod+A',
    scope: SHORTCUT_SCOPES.CANVAS,
    category: SHORTCUT_CATEGORIES.CANVAS,
    allowInInputs: false,
  },
  {
    id: 'canvas-clear-selection',
    label: 'Clear Selection',
    description: 'Deselect all canvas nodes and close picker',
    keys: 'Escape',
    scope: SHORTCUT_SCOPES.CANVAS,
    category: SHORTCUT_CATEGORIES.CANVAS,
    allowInInputs: false,
  },

  // --- Dialogs & Modals ---
  {
    id: 'dialog-close',
    label: 'Close Dialog',
    description: 'Dismiss or cancel active dialog modal',
    keys: 'Escape',
    scope: SHORTCUT_SCOPES.DIALOG,
    category: SHORTCUT_CATEGORIES.DIALOGS,
    allowInInputs: true,
  },
  {
    id: 'dialog-submit',
    label: 'Submit Non-destructive Form',
    description: 'Submit active input form dialog',
    keys: 'Enter',
    scope: SHORTCUT_SCOPES.DIALOG,
    category: SHORTCUT_CATEGORIES.DIALOGS,
    allowInInputs: true,
  },
];

export default SHORTCUTS;

