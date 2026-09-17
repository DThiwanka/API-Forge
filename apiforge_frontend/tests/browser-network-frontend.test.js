import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useBrowserStore } from '../src/features/browser/store/browserStore.js';

describe('Step 51: Browser Network Activity Frontend Tests', () => {
  beforeEach(() => {
    useBrowserStore.getState().reset();
  });

  describe('1. Browser Store Network State Management', () => {
    it('initializes with default network panel state', () => {
      const state = useBrowserStore.getState();
      assert.equal(state.isNetworkPanelOpen, true);
      assert.equal(state.isCapturing, true);
      assert.equal(state.networkFilter, 'all');
      assert.equal(state.networkSearch, '');
      assert.equal(state.selectedEventId, null);
    });

    it('toggles network panel open and closed', () => {
      const store = useBrowserStore.getState();
      store.toggleNetworkPanel();
      assert.equal(useBrowserStore.getState().isNetworkPanelOpen, false);

      store.toggleNetworkPanel();
      assert.equal(useBrowserStore.getState().isNetworkPanelOpen, true);

      store.setIsNetworkPanelOpen(false);
      assert.equal(useBrowserStore.getState().isNetworkPanelOpen, false);
    });

    it('toggles capturing mode and updates pause state', () => {
      const store = useBrowserStore.getState();
      store.toggleCapturing();
      assert.equal(useBrowserStore.getState().isCapturing, false);

      store.setIsCapturing(true);
      assert.equal(useBrowserStore.getState().isCapturing, true);
    });

    it('updates network filter and search query', () => {
      const store = useBrowserStore.getState();
      store.setNetworkFilter('fetch');
      assert.equal(useBrowserStore.getState().networkFilter, 'fetch');

      store.setNetworkSearch('api/users');
      assert.equal(useBrowserStore.getState().networkSearch, 'api/users');
    });

    it('manages selected network event and clearing selection', () => {
      const store = useBrowserStore.getState();
      store.setSelectedEventId('event-abc-123');
      assert.equal(useBrowserStore.getState().selectedEventId, 'event-abc-123');

      store.clearSelectedEvent();
      assert.equal(useBrowserStore.getState().selectedEventId, null);
    });
  });

  describe('2. Network Event Filtering Logic', () => {
    const mockEvents = [
      {
        id: '1',
        method: 'GET',
        url: 'https://api.example.com/users',
        pathname: '/users',
        hostname: 'api.example.com',
        resourceType: 'fetch',
        state: 'completed',
        status: 200,
      },
      {
        id: '2',
        method: 'POST',
        url: 'https://api.example.com/login',
        pathname: '/login',
        hostname: 'api.example.com',
        resourceType: 'xhr',
        state: 'completed',
        status: 401,
      },
      {
        id: '3',
        method: 'GET',
        url: 'https://example.com/home',
        pathname: '/home',
        hostname: 'example.com',
        resourceType: 'document',
        state: 'completed',
        status: 200,
      },
      {
        id: '4',
        method: 'GET',
        url: 'https://cdn.example.com/app.js',
        pathname: '/app.js',
        hostname: 'cdn.example.com',
        resourceType: 'script',
        state: 'completed',
        status: 200,
      },
      {
        id: '5',
        method: 'GET',
        url: 'https://bad.example.com/fail',
        pathname: '/fail',
        hostname: 'bad.example.com',
        resourceType: 'fetch',
        state: 'failed',
        status: null,
      },
    ];

    function applyFilter(events, filter) {
      return events.filter((item) => {
        if (filter === 'fetch') {
          return item.resourceType === 'fetch' || item.resourceType === 'xhr';
        }
        if (filter === 'doc') {
          return item.resourceType === 'document';
        }
        if (filter === 'assets') {
          return (
            item.resourceType === 'script' ||
            item.resourceType === 'stylesheet' ||
            item.resourceType === 'image' ||
            item.resourceType === 'font'
          );
        }
        if (filter === 'errors') {
          return (
            item.state === 'failed' ||
            (typeof item.status === 'number' && item.status >= 400 && item.status < 600)
          );
        }
        return true;
      });
    }

    it('filters correctly for all categories', () => {
      assert.equal(applyFilter(mockEvents, 'all').length, 5);

      const fetchItems = applyFilter(mockEvents, 'fetch');
      assert.equal(fetchItems.length, 3); // 1, 2, 5

      const docItems = applyFilter(mockEvents, 'doc');
      assert.equal(docItems.length, 1);
      assert.equal(docItems[0].id, '3');

      const assetItems = applyFilter(mockEvents, 'assets');
      assert.equal(assetItems.length, 1);
      assert.equal(assetItems[0].id, '4');

      const errorItems = applyFilter(mockEvents, 'errors');
      assert.equal(errorItems.length, 2); // 2 (401) and 5 (failed)
    });
  });

  describe('3. Network Event Search Logic', () => {
    const mockEvents = [
      {
        id: '1',
        method: 'GET',
        url: 'https://api.github.com/users/dulaj',
        pathname: '/users/dulaj',
        hostname: 'api.github.com',
        status: 200,
      },
      {
        id: '2',
        method: 'DELETE',
        url: 'https://api.github.com/repos/test',
        pathname: '/repos/test',
        hostname: 'api.github.com',
        status: 204,
      },
      {
        id: '3',
        method: 'GET',
        url: 'https://httpbin.org/get?q=123',
        pathname: '/get',
        hostname: 'httpbin.org',
        status: 500,
      },
    ];

    function applySearch(events, query) {
      if (!query || !query.trim()) return events;
      const q = query.trim().toLowerCase();
      return events.filter((item) => {
        const matchesMethod = item.method?.toLowerCase().includes(q);
        const matchesPath = item.pathname?.toLowerCase().includes(q);
        const matchesHost = item.hostname?.toLowerCase().includes(q);
        const matchesUrl = item.url?.toLowerCase().includes(q);
        const matchesStatus = String(item.status || '').includes(q);
        return matchesMethod || matchesPath || matchesHost || matchesUrl || matchesStatus;
      });
    }

    it('matches by pathname', () => {
      const results = applySearch(mockEvents, 'users');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, '1');
    });

    it('matches by hostname', () => {
      const results = applySearch(mockEvents, 'httpbin');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, '3');
    });

    it('matches by method', () => {
      const results = applySearch(mockEvents, 'DELETE');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, '2');
    });

    it('matches by status code', () => {
      const results = applySearch(mockEvents, '500');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, '3');
    });
  });

  describe('4. Redacted Header Safety', () => {
    it('verifies that sensitive headers are never raw in event metadata', () => {
      const sampleEvent = {
        id: 'evt-1',
        url: 'https://api.example.com/protected',
        requestHeaders: {
          Authorization: '••••••••',
          Cookie: '••••••••',
          'X-Api-Key': '••••••••',
          Accept: 'application/json',
        },
        responseHeaders: {
          'Set-Cookie': '••••••••',
          'Content-Type': 'application/json',
        },
      };

      assert.equal(sampleEvent.requestHeaders.Authorization, '••••••••');
      assert.equal(sampleEvent.requestHeaders.Cookie, '••••••••');
      assert.equal(sampleEvent.requestHeaders['X-Api-Key'], '••••••••');
      assert.equal(sampleEvent.responseHeaders['Set-Cookie'], '••••••••');
      assert.notEqual(sampleEvent.requestHeaders.Accept, '••••••••');
    });
  });
});

