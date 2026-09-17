import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import networkService, { redactHeaders } from '../src/services/browser/network.service.js';
import browserSessionService from '../src/services/browser/browser-session.service.js';
import env from '../src/config/env.js';

describe('Step 51: Browser Network Activity & Request Capture Backend Tests', () => {
  const workspaceId = 'ws-network-test';
  const userId = 'user-network-test';

  beforeEach(async () => {
    await browserSessionService.clearAllSessions();
    networkService.resetNetworkBuffers();
  });

  afterEach(async () => {
    await browserSessionService.clearAllSessions();
    networkService.resetNetworkBuffers();
  });

  describe('1. Sensitive Header Redaction', () => {
    it('redacts authorization, cookies, and api keys while preserving harmless headers', () => {
      const inputHeaders = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-token-xyz123',
        Cookie: 'session_id=abcdef; token=98765',
        'Set-Cookie': 'session=abc; HttpOnly',
        'X-API-Key': 'key-super-secret-456',
        'X-Custom-Token': 'custom-jwt',
        'Accept': 'text/html',
        'User-Agent': 'APIForge-Test',
      };

      const redacted = redactHeaders(inputHeaders);

      assert.equal(redacted['Content-Type'], 'application/json');
      assert.equal(redacted['Accept'], 'text/html');
      assert.equal(redacted['User-Agent'], 'APIForge-Test');

      // Sensitive headers must be masked with '••••••••'
      assert.equal(redacted['Authorization'], '••••••••');
      assert.equal(redacted['Cookie'], '••••••••');
      assert.equal(redacted['Set-Cookie'], '••••••••');
      assert.equal(redacted['X-API-Key'], '••••••••');
      assert.equal(redacted['X-Custom-Token'], '••••••••');
    });

    it('handles empty or non-object headers safely', () => {
      assert.deepEqual(redactHeaders(null), {});
      assert.deepEqual(redactHeaders(undefined), {});
      assert.deepEqual(redactHeaders({}), {});
    });
  });

  describe('2. Network Event Recording & Correlation', () => {
    it('records a pending request with parsed query parameters and metadata', () => {
      const tabId = 'tab-123';
      const mockReq = {
        url: () => 'https://httpbin.org/api/v1/users?page=2&sort=desc',
        method: () => 'GET',
        headers: () => ({
          Authorization: 'Bearer 12345',
          Accept: 'application/json',
        }),
        resourceType: () => 'fetch',
      };

      const event = networkService.recordRequest(tabId, mockReq);

      assert.ok(event);
      assert.ok(event.id);
      assert.equal(event.tabId, tabId);
      assert.equal(event.method, 'GET');
      assert.equal(event.url, 'https://httpbin.org/api/v1/users?page=2&sort=desc');
      assert.equal(event.pathname, '/api/v1/users');
      assert.equal(event.hostname, 'httpbin.org');
      assert.equal(event.state, 'pending');
      assert.equal(event.resourceType, 'fetch');
      assert.equal(event.requestHeaders.Authorization, '••••••••');
      assert.equal(event.requestHeaders.Accept, 'application/json');

      assert.deepEqual(event.queryParams, [
        { key: 'page', value: '2' },
        { key: 'sort', value: 'desc' },
      ]);

      const events = networkService.getTabNetworkEvents(tabId);
      assert.equal(events.length, 1);
      assert.equal(events[0].id, event.id);
    });

    it('correlates a response with an active request and computes duration and size', async () => {
      const tabId = 'tab-456';
      const mockReq = {
        url: () => 'https://api.example.com/data',
        method: () => 'POST',
        headers: () => ({ 'Content-Type': 'application/json' }),
        resourceType: () => 'fetch',
      };

      const reqEvent = networkService.recordRequest(tabId, mockReq);
      assert.equal(reqEvent.state, 'pending');

      // Add a slight delay to ensure non-zero duration
      await new Promise((r) => setTimeout(r, 10));

      const mockRes = {
        url: () => 'https://api.example.com/data',
        status: () => 201,
        statusText: () => 'Created',
        headers: () => ({
          'Content-Length': '1024',
          'Content-Type': 'application/json',
          'Set-Cookie': 'auth=token123; Secure',
        }),
      };

      const updatedEvent = networkService.recordResponse(tabId, mockRes, reqEvent.id);

      assert.ok(updatedEvent);
      assert.equal(updatedEvent.id, reqEvent.id);
      assert.equal(updatedEvent.state, 'completed');
      assert.equal(updatedEvent.status, 201);
      assert.equal(updatedEvent.statusText, 'Created');
      assert.equal(updatedEvent.sizeBytes, 1024);
      assert.ok(typeof updatedEvent.durationMs === 'number' && updatedEvent.durationMs >= 0);
      assert.equal(updatedEvent.responseHeaders['Set-Cookie'], '••••••••');
    });

    it('records a failed request and captures failure reason', () => {
      const tabId = 'tab-789';
      const mockReq = {
        url: () => 'https://bad-domain-does-not-exist.test/xyz',
        method: () => 'GET',
        headers: () => ({}),
        resourceType: () => 'document',
      };

      const reqEvent = networkService.recordRequest(tabId, mockReq);
      assert.equal(reqEvent.state, 'pending');

      const failedReq = {
        url: () => 'https://bad-domain-does-not-exist.test/xyz',
        failure: () => ({ errorText: 'net::ERR_NAME_NOT_RESOLVED' }),
      };

      const failedEvent = networkService.recordRequestFailed(tabId, failedReq, reqEvent.id);

      assert.ok(failedEvent);
      assert.equal(failedEvent.state, 'failed');
      assert.equal(failedEvent.error, 'net::ERR_NAME_NOT_RESOLVED');
      assert.ok(typeof failedEvent.durationMs === 'number');
    });
  });

  describe('3. Bounded Buffer Enforcement', () => {
    it('bounds the number of recorded events per tab to the configured maximum', () => {
      const tabId = 'tab-buffer-test';
      const originalMax = env.BROWSER_MAX_NETWORK_EVENTS_PER_TAB;
      env.BROWSER_MAX_NETWORK_EVENTS_PER_TAB = 5;

      try {
        for (let i = 1; i <= 8; i++) {
          networkService.recordRequest(tabId, {
            url: () => `https://example.com/resource/${i}`,
            method: () => 'GET',
            headers: () => ({}),
            resourceType: () => 'fetch',
          });
        }

        const events = networkService.getTabNetworkEvents(tabId);
        assert.equal(events.length, 5);
        // The oldest 3 (1, 2, 3) should have been shifted out
        assert.equal(events[0].url, 'https://example.com/resource/4');
        assert.equal(events[4].url, 'https://example.com/resource/8');
      } finally {
        env.BROWSER_MAX_NETWORK_EVENTS_PER_TAB = originalMax;
      }
    });
  });

  describe('4. Session & Tab Integration Lifecycle', () => {
    it('attaches network listeners to newly created tabs and captures navigation traffic', async () => {
      const session = await browserSessionService.createSession(workspaceId, userId);
      const tab = session.tabs[0];

      // Navigate tab to a mock URL using the isolated driver
      // We mock fetch globally for predictable test response
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (url) => ({
        url,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'text/html',
          'content-length': '256',
        }),
        text: async () => '<html><head><title>Test Page</title></head><body>Hello</body></html>',
      });

      try {
        await browserSessionService.navigateTab(
          workspaceId,
          session.id,
          tab.id,
          'https://httpbin.org/get',
          'navigate'
        );

        const events = networkService.getTabNetworkEvents(tab.id);
        assert.equal(events.length, 1);
        assert.equal(events[0].url, 'https://httpbin.org/get');
        assert.equal(events[0].state, 'completed');
        assert.equal(events[0].status, 200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('clears tab network events on demand', async () => {
      const session = await browserSessionService.createSession(workspaceId, userId);
      const tab = session.tabs[0];

      networkService.recordRequest(tab.id, {
        url: () => 'https://example.com/test',
        method: () => 'GET',
        headers: () => ({}),
      });

      assert.equal(networkService.getTabNetworkEvents(tab.id).length, 1);

      networkService.clearTabNetworkEvents(tab.id);
      assert.equal(networkService.getTabNetworkEvents(tab.id).length, 0);
    });

    it('cleans up network buffer when tab or session is closed', async () => {
      const session = await browserSessionService.createSession(workspaceId, userId);
      const tab1 = session.tabs[0];

      const tab2Session = await browserSessionService.createTab(workspaceId, session.id);
      const tab2 = tab2Session.tabs[1];

      networkService.recordRequest(tab1.id, {
        url: () => 'https://example.com/tab1',
        method: () => 'GET',
        headers: () => ({}),
      });

      networkService.recordRequest(tab2.id, {
        url: () => 'https://example.com/tab2',
        method: () => 'GET',
        headers: () => ({}),
      });

      assert.equal(networkService.getTabNetworkEvents(tab1.id).length, 1);
      assert.equal(networkService.getTabNetworkEvents(tab2.id).length, 1);

      // Close tab2
      await browserSessionService.closeTab(workspaceId, session.id, tab2.id);
      assert.equal(networkService.getTabNetworkEvents(tab2.id).length, 0);
      assert.equal(networkService.getTabNetworkEvents(tab1.id).length, 1);

      // Close session
      await browserSessionService.closeSession(workspaceId, session.id);
      assert.equal(networkService.getTabNetworkEvents(tab1.id).length, 0);
    });
  });

  describe('5. Real-Time SSE Subscription', () => {
    it('streams events to connected SSE subscribers', () => {
      const tabId = 'tab-sse-test';
      const messages = [];

      const mockRes = {
        write: (chunk) => messages.push(chunk),
        end: () => {},
      };

      const unsubscribe = networkService.subscribeTabEvents(tabId, mockRes);

      networkService.recordRequest(tabId, {
        url: () => 'https://example.com/stream-test',
        method: () => 'GET',
        headers: () => ({ 'X-Secret': 'super-secret' }),
      });

      assert.equal(messages.length, 1);
      assert.ok(messages[0].includes('event: network_request'));
      assert.ok(messages[0].includes('••••••••'));

      unsubscribe();

      networkService.recordRequest(tabId, {
        url: () => 'https://example.com/stream-test-2',
        method: () => 'GET',
        headers: () => ({}),
      });

      // No new messages after unsubscribe
      assert.equal(messages.length, 1);
    });
  });
});
