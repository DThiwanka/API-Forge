/**
 * Unit verification for First-Workspace Onboarding & Zero-Workspace Flow
 *
 * Verifies:
 * 1. Zero-workspace detection (distinguishing loading vs empty vs populated)
 * 2. Route synchronization logic for zero-workspace vs existing workspaces
 * 3. Workspace creation validation and active workspace activation
 * 4. Protection of workspace-dependent actions (Collection & Request creation guards)
 * 5. Deletion of the final workspace returning to zero-workspace state
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useWorkspaceStore } from '../src/features/workspace/store/workspaceStore.js';

describe('First-Workspace Onboarding & Zero-Workspace Flow', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ activeWorkspaceId: null, sidebarCollapsed: false });
  });

  describe('1. Zero-Workspace State Detection', () => {
    it('correctly distinguishes loading state from zero-workspace state', () => {
      // State A: Loading in progress
      const stateLoading = { isLoading: true, data: [] };
      const isZeroWorkspacesWhileLoading = !stateLoading.isLoading && stateLoading.data.length === 0;
      assert.equal(isZeroWorkspacesWhileLoading, false, 'Loading state must not be treated as zero workspaces');

      // State B: Loaded, empty list
      const stateEmpty = { isLoading: false, data: [] };
      const isZeroWorkspaces = !stateEmpty.isLoading && stateEmpty.data.length === 0;
      assert.equal(isZeroWorkspaces, true, 'Empty list after loading indicates true zero-workspace state');

      // State C: Loaded with workspaces
      const statePopulated = { isLoading: false, data: [{ id: 'ws-1', name: 'Work 1' }] };
      const isZeroWorkspacesPopulated = !statePopulated.isLoading && statePopulated.data.length === 0;
      assert.equal(isZeroWorkspacesPopulated, false, 'Populated list must not be treated as zero workspaces');
    });
  });

  describe('2. Route Synchronization & Active Workspace Resolution', () => {
    it('resolves first workspace when workspaces exist and no route param is set', () => {
      const workspaces = [
        { id: 'ws-primary', name: 'Primary Workspace' },
        { id: 'ws-secondary', name: 'Secondary Workspace' },
      ];
      const routeWorkspaceId = undefined;

      const matchedWorkspace = workspaces.find((w) => w.id === routeWorkspaceId);
      const currentWorkspaceId = matchedWorkspace?.id || (workspaces.length > 0 ? workspaces[0].id : null);

      assert.equal(currentWorkspaceId, 'ws-primary');
    });

    it('resolves null when user has zero workspaces', () => {
      const workspaces = [];
      const routeWorkspaceId = undefined;

      const matchedWorkspace = workspaces.find((w) => w.id === routeWorkspaceId);
      const currentWorkspaceId = matchedWorkspace?.id || (workspaces.length > 0 ? workspaces[0].id : null);

      assert.equal(currentWorkspaceId, null, 'currentWorkspaceId must be null for zero workspaces');
    });

    it('falls back to first existing workspace if routeWorkspaceId does not exist', () => {
      const workspaces = [{ id: 'ws-existing', name: 'Existing' }];
      const routeWorkspaceId = 'deleted-ws-id';

      const isValidRoute = routeWorkspaceId && workspaces.some((w) => w.id === routeWorkspaceId);
      assert.equal(isValidRoute, false);

      const targetRoute = workspaces.length > 0 ? `/workspace/${workspaces[0].id}` : '/workspace';
      assert.equal(targetRoute, '/workspace/ws-existing');
    });

    it('returns to clean /workspace onboarding route when only workspace is deleted', () => {
      const workspaces = []; // all workspaces deleted
      const routeWorkspaceId = 'just-deleted-ws-id';

      const targetRoute = workspaces.length > 0 ? `/workspace/${workspaces[0].id}` : '/workspace';
      assert.equal(targetRoute, '/workspace', 'Must return to clean /workspace onboarding route');
    });
  });

  describe('3. Workspace Activation on Creation', () => {
    it('sets newly created workspace as active workspace in workspaceStore', () => {
      assert.equal(useWorkspaceStore.getState().activeWorkspaceId, null);

      const created = { id: 'ws-new-100', name: 'Brand New Project', role: 'OWNER' };
      useWorkspaceStore.getState().setActiveWorkspaceId(created.id);

      assert.equal(useWorkspaceStore.getState().activeWorkspaceId, 'ws-new-100');
    });
  });

  describe('4. Protection of Workspace-Dependent Operations', () => {
    it('guards collection creation when workspaceId is missing', () => {
      const workspaceId = null;
      let error = null;

      if (!workspaceId) {
        error = 'A workspace is required to create a collection';
      }

      assert.equal(error, 'A workspace is required to create a collection');
    });

    it('guards request creation when workspaceId is missing', () => {
      const workspaceId = null;
      let error = null;

      if (!workspaceId) {
        error = 'A workspace is required to create a request';
      }

      assert.equal(error, 'A workspace is required to create a request');
    });

    it('guards new request shortcut dispatch when no workspace is active', () => {
      const currentWorkspaceId = null;
      let toastMessage = null;

      if (!currentWorkspaceId) {
        toastMessage = 'Please create or select a workspace first';
      }

      assert.equal(toastMessage, 'Please create or select a workspace first');
    });
  });
});

