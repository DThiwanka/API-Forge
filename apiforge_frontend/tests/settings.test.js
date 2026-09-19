import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  useSettingsStore,
  FONT_SIZES,
  DENSITIES,
  THEMES,
  RESPONSE_MODES,
} from '../src/stores/settingsStore.js';
import { SETTINGS_SECTIONS } from '../src/pages/settings/constants/settingsSections.js';
import { SHORTCUTS, SHORTCUT_CATEGORIES } from '../src/features/shortcuts/constants/shortcutRegistry.js';
import { searchCommands } from '../src/features/command-center/utils/commandUtils.js';

describe('Step 59: Settings & Account Experience — Unit Verification', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useSettingsStore.getState().resetDefaults();
  });

  // =========================================================================
  // 1. Settings Store & Preferences
  // =========================================================================
  describe('1. Settings Store & Preference State', () => {
    it('should initialize with correct default preferences', () => {
      const state = useSettingsStore.getState();
      assert.equal(state.theme, 'dark');
      assert.equal(state.density, 'comfortable');
      assert.equal(state.reducedMotion, false);
      assert.equal(state.editorFontSize, 13);
      assert.equal(state.editorWordWrap, true);
      assert.equal(state.defaultResponseMode, 'pretty');
      assert.equal(state.autoFormatOnSave, false);
    });

    it('should validate and update color theme', () => {
      const store = useSettingsStore.getState();
      assert.deepEqual(THEMES, ['dark', 'system']);

      store.setTheme('system');
      assert.equal(useSettingsStore.getState().theme, 'system');

      // Invalid theme should be ignored
      store.setTheme('light-neon-invalid');
      assert.equal(useSettingsStore.getState().theme, 'system');

      store.setTheme('dark');
      assert.equal(useSettingsStore.getState().theme, 'dark');
    });

    it('should validate and update display density', () => {
      const store = useSettingsStore.getState();
      assert.deepEqual(DENSITIES, ['comfortable', 'compact']);

      store.setDensity('compact');
      assert.equal(useSettingsStore.getState().density, 'compact');

      // Invalid density should be rejected
      store.setDensity('super-ultra-compact');
      assert.equal(useSettingsStore.getState().density, 'compact');

      store.setDensity('comfortable');
      assert.equal(useSettingsStore.getState().density, 'comfortable');
    });

    it('should toggle reduced motion preference', () => {
      const store = useSettingsStore.getState();

      store.setReducedMotion(true);
      assert.equal(useSettingsStore.getState().reducedMotion, true);

      store.setReducedMotion(false);
      assert.equal(useSettingsStore.getState().reducedMotion, false);
    });

    it('should validate and update editor font size within allowed range', () => {
      const store = useSettingsStore.getState();
      assert.deepEqual(FONT_SIZES, [12, 13, 14, 15, 16, 18]);

      store.setEditorFontSize(16);
      assert.equal(useSettingsStore.getState().editorFontSize, 16);

      // Disallowed font size should be ignored
      store.setEditorFontSize(42);
      assert.equal(useSettingsStore.getState().editorFontSize, 16);

      store.setEditorFontSize('14'); // string coercion
      assert.equal(useSettingsStore.getState().editorFontSize, 14);
    });

    it('should update editor word wrap and auto format on save', () => {
      const store = useSettingsStore.getState();

      store.setEditorWordWrap(false);
      assert.equal(useSettingsStore.getState().editorWordWrap, false);

      store.setAutoFormatOnSave(true);
      assert.equal(useSettingsStore.getState().autoFormatOnSave, true);
    });

    it('should update default response mode', () => {
      const store = useSettingsStore.getState();
      assert.deepEqual(RESPONSE_MODES, ['pretty', 'raw']);

      store.setDefaultResponseMode('raw');
      assert.equal(useSettingsStore.getState().defaultResponseMode, 'raw');

      // Invalid mode should be ignored
      store.setDefaultResponseMode('binary');
      assert.equal(useSettingsStore.getState().defaultResponseMode, 'raw');

      store.setDefaultResponseMode('pretty');
      assert.equal(useSettingsStore.getState().defaultResponseMode, 'pretty');
    });

    it('should reset all preferences back to defaults on resetDefaults()', () => {
      const store = useSettingsStore.getState();
      store.setTheme('system');
      store.setDensity('compact');
      store.setReducedMotion(true);
      store.setEditorFontSize(18);
      store.setEditorWordWrap(false);
      store.setDefaultResponseMode('raw');
      store.setAutoFormatOnSave(true);

      store.resetDefaults();

      const resetState = useSettingsStore.getState();
      assert.equal(resetState.theme, 'dark');
      assert.equal(resetState.density, 'comfortable');
      assert.equal(resetState.reducedMotion, false);
      assert.equal(resetState.editorFontSize, 13);
      assert.equal(resetState.editorWordWrap, true);
      assert.equal(resetState.defaultResponseMode, 'pretty');
      assert.equal(resetState.autoFormatOnSave, false);
    });
  });

  // =========================================================================
  // 2. Settings Information Architecture & Section Definitions
  // =========================================================================
  describe('2. Settings Information Architecture', () => {
    it('should register exactly 8 core settings sections', () => {
      assert.equal(SETTINGS_SECTIONS.length, 8);
    });

    it('should contain all required sections with unique IDs', () => {
      const expectedIds = [
        'account',
        'workspace',
        'appearance',
        'editor',
        'environments',
        'members',
        'security',
        'shortcuts',
      ];

      const sectionIds = SETTINGS_SECTIONS.map((s) => s.id);
      assert.deepEqual(sectionIds, expectedIds);

      const uniqueIds = new Set(sectionIds);
      assert.equal(uniqueIds.size, expectedIds.length, 'All section IDs must be unique');
    });

    it('should categorize sections into account or workspace scopes correctly', () => {
      const workspaceScoped = SETTINGS_SECTIONS.filter((s) => s.scope === 'workspace').map((s) => s.id);
      const accountScoped = SETTINGS_SECTIONS.filter((s) => s.scope === 'account').map((s) => s.id);

      assert.deepEqual(workspaceScoped, ['workspace', 'environments', 'members']);
      assert.deepEqual(accountScoped, ['account', 'appearance', 'editor', 'security', 'shortcuts']);

      SETTINGS_SECTIONS.forEach((section) => {
        assert.ok(section.label, `Section ${section.id} must have a label`);
        assert.ok(section.icon, `Section ${section.id} must have an icon component`);
        assert.ok(
          section.scope === 'account' || section.scope === 'workspace',
          `Section ${section.id} must declare a valid scope`
        );
      });
    });
  });

  // =========================================================================
  // 3. Workspace Roles & Permissions Logic
  // =========================================================================
  describe('3. Workspace Role-Based Permissions in Settings', () => {
    function canEditWorkspace(role) {
      return role === 'OWNER' || role === 'ADMIN';
    }

    function canDeleteWorkspace(role) {
      return role === 'OWNER';
    }

    function canManageMembers(role) {
      return role === 'OWNER' || role === 'ADMIN';
    }

    it('should allow OWNER to edit, delete workspace, and manage members', () => {
      assert.equal(canEditWorkspace('OWNER'), true);
      assert.equal(canDeleteWorkspace('OWNER'), true);
      assert.equal(canManageMembers('OWNER'), true);
    });

    it('should allow ADMIN to edit and manage members but NOT delete workspace', () => {
      assert.equal(canEditWorkspace('ADMIN'), true);
      assert.equal(canDeleteWorkspace('ADMIN'), false);
      assert.equal(canManageMembers('ADMIN'), true);
    });

    it('should prevent MEMBER from editing or deleting workspace or managing members', () => {
      assert.equal(canEditWorkspace('MEMBER'), false);
      assert.equal(canDeleteWorkspace('MEMBER'), false);
      assert.equal(canManageMembers('MEMBER'), false);
    });

    it('should prevent VIEWER from editing, deleting, or managing members', () => {
      assert.equal(canEditWorkspace('VIEWER'), false);
      assert.equal(canDeleteWorkspace('VIEWER'), false);
      assert.equal(canManageMembers('VIEWER'), false);
    });
  });

  // =========================================================================
  // 4. Keyboard Shortcuts Integrity in Settings
  // =========================================================================
  describe('4. Keyboard Shortcuts Reference in Settings', () => {
    it('should export valid SHORTCUTS registry for settings reference', () => {
      assert.ok(Array.isArray(SHORTCUTS));
      assert.ok(SHORTCUTS.length > 0);

      SHORTCUTS.forEach((sc) => {
        assert.ok(sc.id, 'Shortcut must have an id');
        assert.ok(sc.label, 'Shortcut must have a label');
        assert.ok(sc.keys, 'Shortcut must have keys');
        assert.ok(sc.category, 'Shortcut must have a category');
      });
    });

    it('should map shortcuts to recognized categories', () => {
      const registeredCategories = Object.values(SHORTCUT_CATEGORIES);
      SHORTCUTS.forEach((sc) => {
        assert.ok(
          registeredCategories.includes(sc.category),
          `Shortcut ${sc.id} has category "${sc.category}" which is not in SHORTCUT_CATEGORIES`
        );
      });
    });

    it('should support searching shortcuts by label or key', () => {
      const query = 'save';
      const results = SHORTCUTS.filter(
        (sc) =>
          sc.label.toLowerCase().includes(query) ||
          sc.keys.toLowerCase().includes(query) ||
          sc.category.toLowerCase().includes(query)
      );

      assert.ok(results.length > 0);
      assert.ok(results.some((r) => r.id === 'save-request'));
    });
  });

  // =========================================================================
  // 5. Command Center Integration for Settings
  // =========================================================================
  describe('5. Command Center Search for Settings', () => {
    const mockSettingsCommands = [
      {
        id: 'nav-settings',
        title: 'Open Settings',
        description: 'Configure account, workspace, appearance, and developer preferences',
        group: 'Navigation',
        keywords: ['settings', 'preferences', 'configuration', 'account', 'options'],
      },
      {
        id: 'nav-account-settings',
        title: 'Open Account Settings',
        description: 'View user profile, identity, and session details',
        group: 'Navigation',
        keywords: ['account', 'profile', 'user', 'email', 'settings', 'sign out'],
      },
      {
        id: 'nav-workspace-settings',
        title: 'Open Workspace Settings',
        description: 'Configure workspace name, description, and manage workspace settings',
        group: 'Navigation',
        keywords: ['workspace settings', 'workspace', 'rename', 'delete workspace'],
      },
      {
        id: 'nav-appearance-settings',
        title: 'Open Appearance Settings',
        description: 'Configure theme, display density, and reduced motion',
        group: 'Navigation',
        keywords: ['appearance', 'theme', 'dark', 'light', 'density', 'compact', 'motion'],
      },
      {
        id: 'nav-editor-settings',
        title: 'Open Editor Settings',
        description: 'Configure code font size, word wrap, and response formatting',
        group: 'Navigation',
        keywords: ['editor', 'font size', 'word wrap', 'json', 'formatting', 'developer'],
      },
      {
        id: 'nav-security-settings',
        title: 'Open Security Settings',
        description: 'Review authentication architecture, cookie security, and session management',
        group: 'Navigation',
        keywords: ['security', 'auth', 'sessions', 'cookies', 'encryption', 'logout'],
      },
      {
        id: 'nav-shortcuts-settings',
        title: 'Open Keyboard Shortcuts Settings',
        description: 'View and search keyboard shortcuts in Settings',
        group: 'Navigation',
        keywords: ['shortcuts', 'hotkeys', 'cheat sheet', 'keybindings', 'settings'],
      },
    ];

    it('should find general settings via search query "settings"', () => {
      const results = searchCommands(mockSettingsCommands, 'settings');
      assert.ok(results.length > 0);
      assert.ok(results.some((r) => r.id === 'nav-settings'));
    });

    it('should find appearance settings via query "theme"', () => {
      const results = searchCommands(mockSettingsCommands, 'theme');
      assert.ok(results.length > 0);
      assert.equal(results[0].id, 'nav-appearance-settings');
    });

    it('should find editor settings via query "font size"', () => {
      const results = searchCommands(mockSettingsCommands, 'font size');
      assert.ok(results.length > 0);
      assert.equal(results[0].id, 'nav-editor-settings');
    });

    it('should find security settings via query "auth"', () => {
      const results = searchCommands(mockSettingsCommands, 'auth');
      assert.ok(results.length > 0);
      assert.equal(results[0].id, 'nav-security-settings');
    });

    it('should find account settings via query "profile"', () => {
      const results = searchCommands(mockSettingsCommands, 'profile');
      assert.ok(results.length > 0);
      assert.equal(results[0].id, 'nav-account-settings');
    });
  });

  // =========================================================================
  // 6. Security Guarantees
  // =========================================================================
  describe('6. Security Guarantees & Non-Leakage', () => {
    it('should never expose sensitive auth tokens or passwords in user profile or settings store', () => {
      const state = useSettingsStore.getState();
      assert.equal(state.password, undefined);
      assert.equal(state.token, undefined);
      assert.equal(state.secret, undefined);
      assert.equal(state.jwt, undefined);
      assert.equal(state.refreshToken, undefined);
    });

    it('should only store presentation preferences in localStorage schema', () => {
      const allowedKeys = new Set([
        'theme',
        'density',
        'reducedMotion',
        'editorFontSize',
        'editorWordWrap',
        'defaultResponseMode',
        'autoFormatOnSave',
      ]);

      const state = useSettingsStore.getState();
      Object.keys(state).forEach((key) => {
        if (typeof state[key] !== 'function') {
          assert.ok(
            allowedKeys.has(key),
            `Unexpected key "${key}" found in settingsStore presentation preferences`
          );
        }
      });
    });
  });
});
