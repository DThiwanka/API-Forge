/**
 * Step 63: End-to-End Integration & Regression Testing
 *
 * regression-smoke.test.js — Frontend Regression Smoke Suite
 *
 * Verifies that:
 * 1. Frontend store isolation between workspaces (request state, tabs, canvas, runner)
 * 2. Command Center commands still available and correct after Step 62/63 integration work
 * 3. Accessibility regression — key Step 62 ARIA markers still present
 * 4. Performance regression — key Step 61 utility performance checks still pass
 * 5. Security regression — redaction utilities still function correctly
 * 6. Collection tree + canvas + runner store cross-feature isolation
 *
 * Pattern: node:test + node:assert, pure logic/utility tests, no browser required.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// ── Store imports ──────────────────────────────────────────────────────────
import { useRequestTabStore } from '../src/features/requests/store/requestTabStore.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';
import { useCanvasStore } from '../src/features/canvas/store/canvasStore.js';
import { useCollectionStore } from '../src/features/collections/store/collectionStore.js';
import { useRunnerStore } from '../src/features/runner/store/runnerStore.js';
import { useResponseStore } from '../src/features/response/store/responseStore.js';
import { useCommandCenterStore } from '../src/features/command-center/store/commandCenterStore.js';

// ── Utility imports ────────────────────────────────────────────────────────
import {
  rankCommands,
  searchCommands,
} from '../src/features/command-center/utils/commandUtils.js';
import { inferRelationships } from '../src/features/canvas/utils/relationshipAnalyzer.js';
import { doesRequestMatchFilters } from '../src/features/collections/utils/collectionTreeUtils.js';
import { isLargePayload } from '../src/features/response/utils/responseFormatters.js';
import {
  isSensitiveHeader,
  redactHeaders,
  redactUrl,
  REDACTED_TEXT,
} from '../src/utils/redaction.js';
import { sanitizeErrorMessage } from '../src/utils/errorHandler.js';

describe('Step 63: Frontend Regression Smoke Suite', () => {
  // ══════════════════════════════════════════════════════════════════
  // 1. REQUEST STORE ISOLATION BETWEEN WORKSPACES
  // ══════════════════════════════════════════════════════════════════
  describe('1. Request Store Isolation Between Workspaces', () => {
    const wsA = 'workspace-a-regression';
    const wsB = 'workspace-b-regression';

    beforeEach(() => {
      useRequestTabStore.getState().clearWorkspaceTabs(wsA);
      useRequestTabStore.getState().clearWorkspaceTabs(wsB);
    });

    it('should keep tabs completely isolated between two workspace contexts', () => {
      // Open a tab in workspace A
      useRequestTabStore.getState().openTab(wsA, {
      useRequestTabStore.getState().openTab({
        workspaceId: wsA,
        requestId: 'req-ws-a-1',
        title: 'Workspace A Request',
        method: 'GET',
        isDirty: false,
      });

      // Open a different tab in workspace B
      useRequestTabStore.getState().openTab(wsB, {
      useRequestTabStore.getState().openTab({
        workspaceId: wsB,
        requestId: 'req-ws-b-1',
        title: 'Workspace B Request',
        method: 'POST',
        isDirty: false,
      });

      const tabsA = useRequestTabStore.getState().getWorkspaceTabs(wsA);
      const tabsB = useRequestTabStore.getState().getWorkspaceTabs(wsB);
      const tabsA = useRequestTabStore.getState().getTabs(wsA);
      const tabsB = useRequestTabStore.getState().getTabs(wsB);

      assert.equal(tabsA.length, 1, 'Workspace A should have 1 tab');
      assert.equal(tabsB.length, 1, 'Workspace B should have 1 tab');
      assert.equal(tabsA[0].requestId, 'req-ws-a-1');
      assert.equal(tabsB[0].requestId, 'req-ws-b-1');

      // Closing workspace A tab should not affect workspace B
      useRequestTabStore.getState().closeTab(wsA, 'req-ws-a-1');
      const tabsAAfter = useRequestTabStore.getState().getWorkspaceTabs(wsA);
      const tabsBAfter = useRequestTabStore.getState().getWorkspaceTabs(wsB);
      const tabsAAfter = useRequestTabStore.getState().getTabs(wsA);
      const tabsBAfter = useRequestTabStore.getState().getTabs(wsB);

      assert.equal(tabsAAfter.length, 0, 'Workspace A should have 0 tabs after close');
      assert.equal(tabsBAfter.length, 1, 'Workspace B should still have 1 tab');
    });

    it('should not leak dirty state between workspace tabs', () => {
      useRequestTabStore.getState().openTab(wsA, {
      useRequestTabStore.getState().openTab({
        workspaceId: wsA,
        requestId: 'req-dirty-a',
        title: 'Dirty Request',
        method: 'GET',
        isDirty: false,
      });
      useRequestTabStore.getState().openTab(wsB, {
      useRequestTabStore.getState().openTab({
        workspaceId: wsB,
        requestId: 'req-clean-b',
        title: 'Clean Request',
        method: 'GET',
        isDirty: false,
      });

      // Mark A as dirty
      useRequestTabStore.getState().markDirty(wsA, 'req-dirty-a');
      useRequestTabStore.getState().setTabDirty(wsA, 'req-dirty-a', true);

      const tabsA = useRequestTabStore.getState().getWorkspaceTabs(wsA);
      const tabsB = useRequestTabStore.getState().getWorkspaceTabs(wsB);
      const tabsA = useRequestTabStore.getState().getTabs(wsA);
      const tabsB = useRequestTabStore.getState().getTabs(wsB);

      assert.equal(tabsA[0].isDirty, true, 'WsA tab should be dirty');
      assert.equal(tabsB[0].isDirty, false, 'WsB tab should remain clean');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. CANVAS STORE ISOLATION
  // ══════════════════════════════════════════════════════════════════
  describe('2. Canvas Store State Isolation', () => {
    beforeEach(() => {
      useCanvasStore.setState({ nodes: [], edges: [], selectedNodeId: null });
    });

    it('should start with empty nodes and edges', () => {
      const { nodes, edges, selectedNodeId } = useCanvasStore.getState();
      assert.deepEqual(nodes, []);
      assert.deepEqual(edges, []);
      assert.equal(selectedNodeId, null);
    });

    it('should add and select nodes without polluting unrelated state', () => {
      useCanvasStore.getState().setNodes([
        { id: 'node-1', type: 'requestNode', position: { x: 0, y: 0 }, data: { requestId: 'req-1', name: 'Test' } },
      ]);
      useCanvasStore.getState().setSelectedNodeId('node-1');

      const state = useCanvasStore.getState();
      assert.equal(state.nodes.length, 1);
      assert.equal(state.selectedNodeId, 'node-1');
    });

    it('canvas inferred relationships should be stable across same node set', () => {
      const nodes = [
        {
          id: 'n1',
          type: 'requestNode',
          position: { x: 0, y: 0 },
          data: {
            requestId: 'r1', name: 'Login', method: 'POST',
            url: 'https://api.example.com/auth/login',
            extract: [{ source: 'body', property: 'token', variableName: 'authToken' }],
          },
        },
        {
          id: 'n2',
          type: 'requestNode',
          position: { x: 300, y: 0 },
          data: {
            requestId: 'r2', name: 'Get Profile', method: 'GET',
            url: 'https://api.example.com/profile',
            headers: [{ key: 'Authorization', value: 'Bearer {{authToken}}', enabled: true }],
          },
        },
      ];

      const edges1 = inferRelationships(nodes);
      const edges2 = inferRelationships(nodes);

      // Relationships must be deterministic — same result on repeated calls
      assert.equal(edges1.length, edges2.length, 'Relationship inference must be deterministic');
      assert.equal(edges1.length, 1, 'Should infer exactly 1 relationship edge');
      assert.equal(edges1[0].source, 'n1');
      assert.equal(edges1[0].target, 'n2');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. COLLECTION STORE ISOLATION
  // ══════════════════════════════════════════════════════════════════
  describe('3. Collection Store Expansion State Isolation', () => {
    beforeEach(() => {
      useCollectionStore.setState({ expandedCollections: new Set(), expandedFolders: new Set() });
      useCollectionStore.setState({ expandedCollectionIds: {}, expandedFolderIds: {} });
    });

    it('expanding one collection should not affect another', () => {
      useCollectionStore.getState().expandCollection('coll-a');
      useCollectionStore.getState().expandCollection('coll-b');
      useCollectionStore.getState().collapseCollection('coll-a');

      const { expandedCollections } = useCollectionStore.getState();
      assert.equal(expandedCollections.has('coll-a'), false, 'coll-a should be collapsed');
      assert.equal(expandedCollections.has('coll-b'), true, 'coll-b should remain expanded');
      const { expandedCollectionIds } = useCollectionStore.getState();
      assert.equal(expandedCollectionIds['coll-a'], false, 'coll-a should be collapsed');
      assert.equal(expandedCollectionIds['coll-b'], true, 'coll-b should remain expanded');
    });

    it('collection tree filter should match requests correctly', () => {
      const req = { id: 'r1', name: 'Get Users', method: 'GET', url: 'https://api.example.com/users' };
      assert.equal(doesRequestMatchFilters(req, 'Users', 'GET'), true);
      assert.equal(doesRequestMatchFilters(req, 'Users', 'POST'), false);
      assert.equal(doesRequestMatchFilters(req, 'nonexistent', 'GET'), false);
      assert.equal(doesRequestMatchFilters(req, '', ''), true);
      assert.equal(doesRequestMatchFilters(req, '', 'GET'), true);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. RUNNER STORE ISOLATION
  // 4. RESPONSE STORE ISOLATION ACROSS REQUESTS
  // ══════════════════════════════════════════════════════════════════
  describe('4. Runner Store Result Isolation', () => {
  describe('4. Response Store Result Isolation Across Requests', () => {
    beforeEach(() => {
      useRunnerStore.setState({
        results: [],
        isRunning: false,
        summary: null,
        selectedCollectionId: null,
        selectedEnvironmentId: null,
        selectedRequestIds: [],
        selectedFolderIds: [],
        stopOnError: false,
      useResponseStore.setState({
        status: 'idle',
        response: null,
        error: null,
        responsesByRequest: {},
        activeRequestId: null,
      });
    });

    it('should start with empty results and non-running state', () => {
      const state = useRunnerStore.getState();
      assert.deepEqual(state.results, []);
      assert.equal(state.isRunning, false);
      assert.equal(state.summary, null);
    it('should isolate response state between different request IDs', () => {
      // Set response for req-1
      useResponseStore.getState().setResponse('req-1', { status: 200, data: { ok: true } });

      // Set response for req-2
      useResponseStore.getState().setResponse('req-2', { status: 404, data: { error: 'Not found' } });

      const stateReq1 = useResponseStore.getState().getResponseState('req-1');
      const stateReq2 = useResponseStore.getState().getResponseState('req-2');

      assert.equal(stateReq1.status, 'success');
      assert.equal(stateReq1.response.status, 200);

      assert.equal(stateReq2.status, 'success');
      assert.equal(stateReq2.response.status, 404);
    });

    it('should update results without affecting other state slices', () => {
      useRunnerStore.getState().setResults([
        { requestId: 'r1', name: 'Test Request', status: 'passed', timeMs: 45 },
      ]);
    it('switching active request should scope active view cleanly', () => {
      useResponseStore.getState().setResponse('req-alpha', { status: 201 });
      useResponseStore.getState().setActiveRequestId('req-alpha');

      const state = useRunnerStore.getState();
      assert.equal(state.results.length, 1);
      assert.equal(state.isRunning, false); // should not have changed
      assert.equal(state.summary, null);    // should not have changed
      let current = useResponseStore.getState();
      assert.equal(current.activeRequestId, 'req-alpha');
      assert.equal(current.status, 'success');

      // Switch to unexecuted request
      useResponseStore.getState().setActiveRequestId('req-beta');
      current = useResponseStore.getState();
      assert.equal(current.activeRequestId, 'req-beta');
      assert.equal(current.status, 'idle');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. COMMAND CENTER REGRESSION
  // ══════════════════════════════════════════════════════════════════
  describe('5. Command Center Regression', () => {
    it('should rank commands deterministically — highest relevance first', () => {
      const commands = [
        { id: 'c1', title: 'Open Settings', group: 'Actions', keywords: ['settings', 'preferences'] },
        { id: 'c2', title: 'Open Environments', group: 'Actions', keywords: ['environment', 'env', 'variables'] },
        { id: 'c3', title: 'Settings: Security', group: 'Settings', keywords: ['security', 'auth', 'settings'] },
        { id: 'c4', title: 'Create New Request', group: 'Actions', keywords: ['request', 'new', 'create'] },
      ];

      const results = rankCommands(commands, 'settings');
      assert.ok(results.length >= 2, 'Should return at least 2 results for "settings"');
      // Top result should be most relevant to "settings"
      const titles = results.map((r) => r.title);
      assert.ok(
        titles[0].toLowerCase().includes('settings'),
        `Top result should contain "settings", got: ${titles[0]}`
      );
    });

    it('should not surface secret environment values in command search results', () => {
      const commands = [
        {
          id: 'env-1',
          title: 'Environment: Production',
          group: 'Environments',
          keywords: ['Production', 'baseUrl'],
          // description should NOT contain the secret value
          description: 'Production environment (3 variables)',
        },
      ];

      const results = searchCommands(commands, 'Production');
      assert.ok(results.length >= 1);
      // Verify no secret values appear in result keywords or description
      const secretValue = 'super-secret-prod-key-8888';
      const resultStr = JSON.stringify(results);
      assert.ok(!resultStr.includes(secretValue), 'Secret value must not appear in command search results');
    });

    it('command center store should open and close cleanly', () => {
      const store = useCommandCenterStore.getState();
      store.open();
      assert.equal(useCommandCenterStore.getState().isOpen, true);
      store.close();
      assert.equal(useCommandCenterStore.getState().isOpen, false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 6. SECURITY REGRESSION — REDACTION UTILITIES
  // ══════════════════════════════════════════════════════════════════
  describe('6. Security Regression — Redaction Utilities', () => {
    it('should still correctly redact sensitive headers', () => {
      assert.equal(isSensitiveHeader('Authorization'), true);
      assert.equal(isSensitiveHeader('Cookie'), true);
      assert.equal(isSensitiveHeader('x-api-key'), true);
      assert.equal(isSensitiveHeader('Content-Type'), false);
      assert.equal(isSensitiveHeader('Accept'), false);
    });

    it('should redact Authorization from header object while preserving safe headers', () => {
      const headers = {
        Authorization: 'Bearer eyJhbGciOiJIUzI1Ni...',
        'Content-Type': 'application/json',
        'X-API-Key': 'live_key_xyz',
        Accept: '*/*',
      };
      const redacted = redactHeaders(headers);
      assert.equal(redacted['Authorization'], REDACTED_TEXT);
      assert.equal(redacted['X-API-Key'], REDACTED_TEXT);
      assert.equal(redacted['Content-Type'], 'application/json');
      assert.equal(redacted['Accept'], '*/*');
    });

    it('should redact basic auth credentials in URLs', () => {
      const url = 'https://admin:mypassword@api.example.com/data';
      const redacted = redactUrl(url);
      assert.ok(!redacted.includes('mypassword'), 'Password should be redacted from URL');
      assert.ok(redacted.includes(REDACTED_TEXT), 'URL should contain REDACTED marker');
    });

    it('should sanitize error messages to remove stack traces and file paths', () => {
      const errMsg = 'Error at C:\\Users\\Admin\\secret\\config.js:42:15';
      const sanitized = sanitizeErrorMessage(errMsg);
      assert.ok(!sanitized.includes('C:\\Users\\Admin'));
      assert.ok(!sanitized.includes('secret\\config.js'));
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. PERFORMANCE REGRESSION — KEY UTILITY BENCHMARKS
  // ══════════════════════════════════════════════════════════════════
  describe('7. Performance Regression — Critical Utility Benchmarks', () => {
    it('filtering 500 requests should still complete in under 25ms', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const requests = Array.from({ length: 500 }, (_, i) => ({
        id: `req-${i}`,
        name: `Endpoint ${i}`,
        method: methods[i % methods.length],
        url: `https://api.example.com/resource/${i}`,
        folderId: i % 5 === 0 ? null : `folder-${i % 20}`,
      }));

      const start = performance.now();
      const matches = requests.filter((r) => doesRequestMatchFilters(r, 'Endpoint 42', 'POST'));
      const duration = performance.now() - start;

      assert.ok(duration < 25, `Collection filter regression: took ${duration.toFixed(2)}ms (limit: 25ms)`);
      assert.ok(matches.length > 0, 'Should find at least one matching request');
    });

    it('ranking 300 commands should complete in under 20ms', () => {
      const commands = Array.from({ length: 300 }, (_, i) => ({
        id: `cmd-${i}`,
        title: `API Resource ${i}`,
        group: 'Requests',
        keywords: [`Resource ${i}`, 'GET', `https://api.example.com/items/${i}`],
      }));

      const start = performance.now();
      rankCommands(commands, 'Resource 150');
      const duration = performance.now() - start;

      assert.ok(duration < 20, `Command ranking regression: took ${duration.toFixed(2)}ms (limit: 20ms)`);
    });

    it('large payload detection should remain accurate', () => {
      assert.equal(isLargePayload(5 * 1024 * 1024, ''), true, '5MB should be large');
      assert.equal(isLargePayload(20 * 1024, '{"ok":true}'), false, '20KB should not be large');
    });

    it('canvas relationship inference for 50 nodes should complete under 30ms', () => {
      const nodes = Array.from({ length: 50 }, (_, i) => ({
        id: `n${i}`,
        type: 'requestNode',
        position: { x: i * 100, y: 0 },
        data: {
          requestId: `r${i}`,
          name: `Node ${i}`,
          method: 'GET',
          url: `https://api.example.com/item-${i}`,
          extract: i === 0 ? [{ source: 'body', property: 'id', variableName: 'itemId' }] : [],
          headers: i > 0 && i < 5 ? [{ key: 'X-Item', value: '{{itemId}}', enabled: true }] : [],
        },
      }));

      const start = performance.now();
      inferRelationships(nodes);
      const duration = performance.now() - start;

      assert.ok(duration < 30, `Canvas relationship regression: ${duration.toFixed(2)}ms (limit: 30ms)`);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 8. ACCESSIBILITY REGRESSION — KEY STEP 62 MARKERS
  // ══════════════════════════════════════════════════════════════════
  describe('8. Accessibility Regression — Step 62 Key Markers', () => {
    it('Dialog.jsx focus trapping code should remain present', () => {
      const content = fs.readFileSync(path.join(srcDir, 'components/ui/Dialog.jsx'), 'utf8');
      assert.ok(content.includes("e.key === 'Tab'"), 'Dialog must still trap Tab key');
      assert.ok(content.includes('aria-modal="true"'), 'Dialog must still declare aria-modal');
      assert.ok(content.includes('role="dialog"'), 'Dialog must still declare role=dialog');
    });

    it('Tabs.jsx must still have WAI-ARIA tablist pattern', () => {
      const content = fs.readFileSync(path.join(srcDir, 'components/ui/Tabs.jsx'), 'utf8');
      assert.ok(content.includes('role="tablist"'), 'Tabs must still have tablist');
      assert.ok(content.includes('aria-selected='), 'Tabs must still have aria-selected');
      assert.ok(content.includes('ArrowRight'), 'Tabs must still support arrow navigation');
    });

    it('AppShell.jsx must still contain skip-to-content link', () => {
      const content = fs.readFileSync(path.join(srcDir, 'components/layout/AppShell.jsx'), 'utf8');
      assert.ok(content.includes('href="#main-content"'), 'AppShell must still have skip link');
      assert.ok(content.includes('skip-to-content'), 'AppShell must still reference skip-to-content class');
    });

    it('index.css must still contain prefers-reduced-motion block', () => {
      const content = fs.readFileSync(path.join(srcDir, 'styles/index.css'), 'utf8');
      assert.ok(content.includes('@media (prefers-reduced-motion: reduce)'),
        'index.css must still have reduced-motion media query');
    });

    it('Collection tree items must still have treeitem ARIA roles', () => {
      const reqItem = fs.readFileSync(path.join(srcDir, 'features/collections/components/RequestItem.jsx'), 'utf8');
      const folderItem = fs.readFileSync(path.join(srcDir, 'features/collections/components/FolderItem.jsx'), 'utf8');
      assert.ok(reqItem.includes('role="treeitem"'), 'RequestItem must still have role=treeitem');
      assert.ok(folderItem.includes('role="treeitem"'), 'FolderItem must still have role=treeitem');
    });

    it('Login form must still have accessible label/id pairing', () => {
      const content = fs.readFileSync(path.join(srcDir, 'pages/Login.jsx'), 'utf8');
      assert.ok(content.includes('htmlFor="login-email"'), 'Login must still have htmlFor for email');
      assert.ok(content.includes('id="login-email"'), 'Login must still have id for email input');
      assert.ok(content.includes('role="alert"'), 'Login must still have role=alert for errors');
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 9. CROSS-FEATURE STORE REGRESSION — NO UNINTENDED COUPLING
  // ══════════════════════════════════════════════════════════════════
  describe('9. Cross-Feature Store Regression — No Unintended Coupling', () => {
    it('modifying request tabs should not mutate canvas store state', () => {
      useCanvasStore.setState({ nodes: [{ id: 'original-node' }], edges: [], selectedNodeId: null });

      // Open a tab — should not touch canvas store
      useRequestTabStore.getState().openTab('ws-test', {
        requestId: 'req-isolated',
        title: 'Isolated',
        method: 'GET',
        isDirty: false,
      });

      const canvasState = useCanvasStore.getState();
      assert.equal(canvasState.nodes.length, 1, 'Canvas nodes should not be modified by tab operations');
      assert.equal(canvasState.nodes[0].id, 'original-node', 'Canvas node identity should be preserved');

      // Cleanup
      useRequestTabStore.getState().clearWorkspaceTabs('ws-test');
      useCanvasStore.setState({ nodes: [], edges: [], selectedNodeId: null });
    });

    it('modifying runner results should not change collection expansion state', () => {
    it('modifying response results should not change collection expansion state', () => {
      useCollectionStore.getState().expandCollection('coll-isolation-test');

      useRunnerStore.getState().setResults([
        { requestId: 'r1', name: 'Run Result', status: 'passed', timeMs: 10 },
      ]);
      useResponseStore.getState().setResponse('req-isolation', { status: 200 });

      const { expandedCollections } = useCollectionStore.getState();
      assert.ok(expandedCollections.has('coll-isolation-test'),
        'Collection expansion state must not be affected by runner results');
      const { expandedCollectionIds } = useCollectionStore.getState();
      assert.equal(expandedCollectionIds['coll-isolation-test'], true,
        'Collection expansion state must not be affected by response results');

      // Cleanup
      useCollectionStore.getState().collapseCollection('coll-isolation-test');
      useRunnerStore.setState({ results: [] });
      useResponseStore.setState({ responsesByRequest: {} });
    });
  });
});

