import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeBrowserUrl,
  validateBrowserUrl,
} from '../src/services/browser/browser-url.validator.js';
import browserSessionService from '../src/services/browser/browser-session.service.js';

describe('Step 49: Browser Space Foundation & Isolated Browser Sessions', () => {
  const workspaceA = 'ws-test-browser-a';
  const workspaceB = 'ws-test-browser-b';
  const userA = 'user-test-a';

  beforeEach(async () => {
    await browserSessionService.clearAllSessions();
  });

  afterEach(async () => {
    await browserSessionService.clearAllSessions();
  });

  describe('1. URL Normalization & Safe Validation', () => {
    it('normalizes URLs without protocol to https://', () => {
      assert.equal(normalizeBrowserUrl('example.com'), 'https://example.com');
      assert.equal(normalizeBrowserUrl('api.github.com/users'), 'https://api.github.com/users');
      assert.equal(normalizeBrowserUrl('  httpbin.org/get  '), 'https://httpbin.org/get');
      assert.equal(normalizeBrowserUrl('http://example.com'), 'http://example.com');
      assert.equal(normalizeBrowserUrl('https://example.com'), 'https://example.com');
    });

    it('handles empty or non-string inputs safely', () => {
      assert.equal(normalizeBrowserUrl(''), '');
      assert.equal(normalizeBrowserUrl(null), '');
      assert.equal(normalizeBrowserUrl(undefined), '');
    });

    it('rejects disallowed protocols (file:, javascript:, data:, blob:, about:, chrome:)', async () => {
      const disallowed = [
        'file:///etc/passwd',
        'javascript:alert(1)',
        'data:text/html,<b>pwned</b>',
        'blob:https://example.com/uuid',
        'about:blank',
        'chrome://settings',
        'view-source:https://example.com',
        'ftp://ftp.example.com',
      ];

      for (const target of disallowed) {
        await assert.rejects(
          async () => validateBrowserUrl(target),
          (err) => err.statusCode === 400 && (err.errors?.code === 'BLOCKED_BROWSER_URL' || err.errors?.code === 'INVALID_BROWSER_URL'),
          `Should reject disallowed protocol: ${target}`
        );
      }
    });

    it('rejects URLs with embedded credentials', async () => {
      await assert.rejects(
        async () => validateBrowserUrl('https://admin:secret@api.example.com'),
        (err) => err.statusCode === 400 && err.errors?.code === 'BLOCKED_BROWSER_URL'
      );
    });

    it('blocks SSRF targets (localhost, 127.0.0.1, private IPs, cloud metadata)', async () => {
      const blockedTargets = [
        'http://localhost:5000',
        'http://127.0.0.1:8080',
        'http://0.0.0.0',
        'http://169.254.169.254/latest/meta-data',
        'http://metadata.google.internal',
        'http://10.0.0.1',
        'http://192.168.1.1',
        'http://172.16.0.1',
      ];

      for (const target of blockedTargets) {
        await assert.rejects(
          async () => validateBrowserUrl(target, { allowLocalTargets: false }),
          (err) => err.statusCode === 400 && err.errors?.code === 'BLOCKED_BROWSER_URL',
          `Should reject SSRF target: ${target}`
        );
      }
    });
  });

  describe('2. Browser Session Lifecycle & Workspace Isolation', () => {
    it('creates an isolated session with an initial tab', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);

      assert.ok(session.id);
      assert.equal(session.workspaceId, workspaceA);
      assert.equal(session.tabs.length, 1);
      assert.equal(session.activeTabId, session.tabs[0].id);
      assert.equal(session.tabs[0].title, 'New Tab');
      assert.equal(session.tabs[0].url, '');
    });

    it('retrieves active sessions for the workspace', async () => {
      const session1 = await browserSessionService.createSession(workspaceA, userA);
      const session2 = await browserSessionService.createSession(workspaceA, userA);

      const list = browserSessionService.getSessions(workspaceA);
      assert.equal(list.length, 2);
      assert.ok(list.some((s) => s.id === session1.id));
      assert.ok(list.some((s) => s.id === session2.id));
    });

    it('prevents cross-workspace session access', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);

      // Attempt to access session created in workspaceA using workspaceB
      assert.throws(
        () => browserSessionService.getSession(workspaceB, session.id),
        (err) => err.statusCode === 404 && err.errors?.code === 'BROWSER_SESSION_NOT_FOUND'
      );
    });

    it('closes a browser session cleanly', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);
      const result = await browserSessionService.closeSession(workspaceA, session.id);

      assert.equal(result.success, true);
      assert.equal(result.sessionId, session.id);

      // Subsequent retrieval should return 404
      assert.throws(
        () => browserSessionService.getSession(workspaceA, session.id),
        (err) => err.statusCode === 404
      );
    });
  });

  describe('3. Tab Lifecycle & Navigation', () => {
    it('creates and closes tabs within a session', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);
      const initialTabId = session.activeTabId;

      // Create second tab
      const updated = await browserSessionService.createTab(workspaceA, session.id);
      assert.equal(updated.tabs.length, 2);
      assert.notEqual(updated.activeTabId, initialTabId);

      // Close the new tab
      const afterClose = await browserSessionService.closeTab(
        workspaceA,
        session.id,
        updated.activeTabId
      );
      assert.equal(afterClose.tabs.length, 1);
      assert.equal(afterClose.activeTabId, initialTabId);
    });

    it('creates a fresh blank tab if the last tab is closed', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);
      const onlyTabId = session.tabs[0].id;

      const afterClose = await browserSessionService.closeTab(
        workspaceA,
        session.id,
        onlyTabId
      );
      assert.equal(afterClose.tabs.length, 1);
      assert.notEqual(afterClose.tabs[0].id, onlyTabId);
      assert.equal(afterClose.tabs[0].title, 'New Tab');
    });

    it('navigates to a valid URL and captures title and URL state', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);
      const tabId = session.tabs[0].id;

      // Use a safe public HTTP endpoint or data
      const updated = await browserSessionService.navigateTab(
        workspaceA,
        session.id,
        tabId,
        'https://httpbin.org/get'
      );

      const tab = updated.tabs.find((t) => t.id === tabId);
      assert.ok(tab);
      assert.equal(tab.loading, false);
      assert.ok(tab.url.includes('httpbin.org/get'));
    });

    it('rejects navigation to blocked SSRF targets with structured error', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);
      const tabId = session.tabs[0].id;

      await assert.rejects(
        async () =>
          browserSessionService.navigateTab(
            workspaceA,
            session.id,
            tabId,
            'http://127.0.0.1:9000'
          ),
        (err) => err.statusCode === 400 && err.errors?.code === 'BLOCKED_BROWSER_URL'
      );
    });
  });

  describe('4. Inactive Session Cleanup', () => {
    it('prunes sessions exceeding the inactivity timeout threshold', async () => {
      const session = await browserSessionService.createSession(workspaceA, userA);
      assert.equal(browserSessionService.getSessions(workspaceA).length, 1);

      // Trigger cleanup with 0ms threshold to clean all inactive sessions
      const cleaned = await browserSessionService.cleanupInactiveSessions(0);
      assert.equal(cleaned, 1);
      assert.equal(browserSessionService.getSessions(workspaceA).length, 0);
    });
  });
});

