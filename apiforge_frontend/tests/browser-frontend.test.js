import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useBrowserStore } from '../src/features/browser/store/browserStore.js';

describe('Step 49: Browser Space Frontend State & Store Tests', () => {
  beforeEach(() => {
    useBrowserStore.getState().reset();
  });

  describe('1. Browser Store State Management', () => {
    it('initializes with default clean state', () => {
      const state = useBrowserStore.getState();
      assert.equal(state.activeSessionId, null);
      assert.equal(state.activeTabId, null);
      assert.equal(state.addressBarValue, '');
      assert.equal(state.isLoading, false);
      assert.equal(state.error, null);
    });

    it('updates activeSessionId and activeTabId', () => {
      const store = useBrowserStore.getState();
      store.setActiveSessionId('sess-123');
      store.setActiveTabId('tab-456');

      assert.equal(useBrowserStore.getState().activeSessionId, 'sess-123');
      assert.equal(useBrowserStore.getState().activeTabId, 'tab-456');
    });

    it('updates addressBarValue and loading states', () => {
      const store = useBrowserStore.getState();
      store.setAddressBarValue('https://httpbin.org/get');
      store.setIsLoading(true);

      assert.equal(useBrowserStore.getState().addressBarValue, 'https://httpbin.org/get');
      assert.equal(useBrowserStore.getState().isLoading, true);

      store.setIsLoading(false);
      assert.equal(useBrowserStore.getState().isLoading, false);
    });

    it('handles error state and clearing error', () => {
      const store = useBrowserStore.getState();
      store.setError({
        code: 'BLOCKED_BROWSER_URL',
        message: 'Destination blocked by SSRF protection',
      });

      assert.deepEqual(useBrowserStore.getState().error, {
        code: 'BLOCKED_BROWSER_URL',
        message: 'Destination blocked by SSRF protection',
      });

      store.clearError();
      assert.equal(useBrowserStore.getState().error, null);
    });

    it('resets all state to initial defaults on reset()', () => {
      const store = useBrowserStore.getState();
      store.setActiveSessionId('sess-1');
      store.setActiveTabId('tab-1');
      store.setAddressBarValue('https://example.com');
      store.setIsLoading(true);
      store.setError({ code: 'ERR' });

      store.reset();

      const state = useBrowserStore.getState();
      assert.equal(state.activeSessionId, null);
      assert.equal(state.activeTabId, null);
      assert.equal(state.addressBarValue, '');
      assert.equal(state.isLoading, false);
      assert.equal(state.error, null);
    });
  });

  describe('2. Address Normalization Logic', () => {
    function normalizeTestUrl(input) {
      if (!input || typeof input !== 'string') return '';
      const trimmed = input.trim();
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(trimmed)) {
        return trimmed;
      }
      return `https://${trimmed}`;
    }

    it('prepends https:// when protocol is missing', () => {
      assert.equal(normalizeTestUrl('httpbin.org/get'), 'https://httpbin.org/get');
      assert.equal(normalizeTestUrl('jsonplaceholder.typicode.com'), 'https://jsonplaceholder.typicode.com');
    });

    it('preserves explicit http:// and https:// schemes', () => {
      assert.equal(normalizeTestUrl('http://example.com'), 'http://example.com');
      assert.equal(normalizeTestUrl('https://example.com'), 'https://example.com');
    });

    it('safely handles empty input', () => {
      assert.equal(normalizeTestUrl(''), '');
      assert.equal(normalizeTestUrl(null), '');
      assert.equal(normalizeTestUrl(undefined), '');
    });
  });
});

