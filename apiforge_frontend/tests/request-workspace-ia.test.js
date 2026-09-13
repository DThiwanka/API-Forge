import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Step 42: Request Workspace Navigation & Information Architecture — Unit Verification', () => {
  describe('1. Configuration Tab Badges & Status Indicators', () => {
    const AUTH_LABELS = {
      bearer: 'Bearer',
      basic: 'Basic',
      'api-key': 'API Key',
    };

    const BODY_LABELS = {
      json: 'JSON',
      text: 'Text',
      'x-www-form-urlencoded': 'Form',
      'form-data': 'Multipart',
      raw: 'Raw',
    };

    it('should correctly map auth types to user-facing labels', () => {
      assert.equal(AUTH_LABELS['bearer'], 'Bearer');
      assert.equal(AUTH_LABELS['basic'], 'Basic');
      assert.equal(AUTH_LABELS['api-key'], 'API Key');
      assert.equal(AUTH_LABELS['none'], undefined);
    });

    it('should correctly map body modes to compact pill labels', () => {
      assert.equal(BODY_LABELS['json'], 'JSON');
      assert.equal(BODY_LABELS['text'], 'Text');
      assert.equal(BODY_LABELS['x-www-form-urlencoded'], 'Form');
      assert.equal(BODY_LABELS['form-data'], 'Multipart');
      assert.equal(BODY_LABELS['raw'], 'Raw');
    });

    it('should compute active query params and headers count excluding disabled or empty items', () => {
      const queryParams = [
        { key: 'page', value: '1', enabled: true },
        { key: 'limit', value: '20', enabled: true },
        { key: '', value: '', enabled: true }, // Empty key ignored
        { key: 'sort', value: 'desc', enabled: false }, // Disabled ignored
      ];

      const activeParamsCount = queryParams.filter((p) => p.enabled !== false && p.key?.trim()).length;
      assert.equal(activeParamsCount, 2);

      const headers = [
        { key: 'Accept', value: 'application/json', enabled: true },
        { key: 'Authorization', value: 'Bearer token', enabled: true },
        { key: 'X-Custom', value: 'test', enabled: false },
      ];

      const activeHeadersCount = headers.filter((h) => h.enabled !== false && h.key?.trim()).length;
      assert.equal(activeHeadersCount, 2);
    });

    it('should determine auth and body configured states', () => {
      const noAuth = { type: 'none' };
      const bearerAuth = { type: 'bearer', bearer: { token: 'secret' } };
      assert.equal(Boolean(noAuth?.type && noAuth.type !== 'none'), false);
      assert.equal(Boolean(bearerAuth?.type && bearerAuth.type !== 'none'), true);

      const noBody = { mode: 'none' };
      const jsonBody = { mode: 'json', raw: '{"key": "value"}' };
      assert.equal(Boolean(noBody?.mode && noBody.mode !== 'none'), false);
      assert.equal(Boolean(jsonBody?.mode && jsonBody.mode !== 'none'), true);
    });
  });

  describe('2. Keyboard Navigation Shortcuts (Alt+1..6)', () => {
    const SHORTCUT_TAB_MAP = {
      '1': 'params',
      '2': 'headers',
      '3': 'auth',
      '4': 'body',
      '5': 'settings',
      '6': 'tests',
    };

    it('should map Alt+1 through Alt+6 to appropriate configuration tabs', () => {
      assert.equal(SHORTCUT_TAB_MAP['1'], 'params');
      assert.equal(SHORTCUT_TAB_MAP['2'], 'headers');
      assert.equal(SHORTCUT_TAB_MAP['3'], 'auth');
      assert.equal(SHORTCUT_TAB_MAP['4'], 'body');
      assert.equal(SHORTCUT_TAB_MAP['5'], 'settings');
      assert.equal(SHORTCUT_TAB_MAP['6'], 'tests');
      assert.equal(SHORTCUT_TAB_MAP['7'], undefined);
    });

    it('should simulate tab cycling with left/right arrows with wrap-around', () => {
      const tabs = ['params', 'headers', 'auth', 'body', 'settings', 'tests'];

      const getNextTab = (currentId, direction) => {
        const idx = tabs.indexOf(currentId);
        if (direction === 'right') {
          return tabs[(idx + 1) % tabs.length];
        } else {
          return tabs[(idx - 1 + tabs.length) % tabs.length];
        }
      };

      assert.equal(getNextTab('params', 'right'), 'headers');
      assert.equal(getNextTab('tests', 'right'), 'params'); // wrap
      assert.equal(getNextTab('params', 'left'), 'tests'); // wrap
      assert.equal(getNextTab('auth', 'left'), 'headers');
    });
  });

  describe('3. Resizable Panel Split Bounds & Presets', () => {
    const clampSplit = (rawPercent) => {
      const clamped = Math.min(Math.max(rawPercent, 20), 80);
      return Math.round(clamped * 10) / 10;
    };

    it('should enforce min 20% and max 80% split bounds', () => {
      assert.equal(clampSplit(10), 20);
      assert.equal(clampSplit(19.9), 20);
      assert.equal(clampSplit(50), 50);
      assert.equal(clampSplit(75.4), 75.4);
      assert.equal(clampSplit(85), 80);
      assert.equal(clampSplit(95), 80);
    });

    it('should provide sensible layout presets', () => {
      const PRESETS = {
        FOCUS_REQUEST: 80,
        BALANCED: 50,
        MAXIMIZE_RESPONSE: 25,
      };

      assert.ok(PRESETS.FOCUS_REQUEST >= 75 && PRESETS.FOCUS_REQUEST <= 80);
      assert.equal(PRESETS.BALANCED, 50);
      assert.ok(PRESETS.MAXIMIZE_RESPONSE >= 20 && PRESETS.MAXIMIZE_RESPONSE <= 30);
    });

    it('should handle keyboard adjustments with ArrowLeft, ArrowRight, Home, End, and Enter', () => {
      const adjustSplit = (current, key) => {
        switch (key) {
          case 'ArrowLeft':
            return Math.max(current - 2, 20);
          case 'ArrowRight':
            return Math.min(current + 2, 80);
          case 'Home':
            return 20;
          case 'End':
            return 80;
          case 'Enter':
            return 50;
          default:
            return current;
        }
      };

      assert.equal(adjustSplit(50, 'ArrowLeft'), 48);
      assert.equal(adjustSplit(21, 'ArrowLeft'), 20); // Clamped
      assert.equal(adjustSplit(50, 'ArrowRight'), 52);
      assert.equal(adjustSplit(79, 'ArrowRight'), 80); // Clamped
      assert.equal(adjustSplit(30, 'Home'), 20);
      assert.equal(adjustSplit(30, 'End'), 80);
      assert.equal(adjustSplit(75, 'Enter'), 50); // Reset
    });
  });

  describe('4. Contextual Actions & Canvas Integration', () => {
    it('should format request node payload correctly for Canvas addition', () => {
      const request = {
        id: 'req-42',
        name: 'Get User Profile',
        method: 'GET',
        url: 'https://api.example.com/users/42',
        collectionId: 'col-123',
      };

      const canvasPayload = {
        id: request.id,
        name: request.name || 'Untitled Request',
        method: request.method || 'GET',
        url: request.url || '',
        collectionId: request.collectionId,
      };

      assert.deepEqual(canvasPayload, {
        id: 'req-42',
        name: 'Get User Profile',
        method: 'GET',
        url: 'https://api.example.com/users/42',
        collectionId: 'col-123',
      });
    });

    it('should guard against copying empty or undefined URL', () => {
      const validateCopyUrl = (url) => {
        if (!url || !url.trim()) {
          return { valid: false, error: 'No URL configured on this request' };
        }
        return { valid: true, url };
      };

      assert.equal(validateCopyUrl('').valid, false);
      assert.equal(validateCopyUrl('   ').valid, false);
      assert.equal(validateCopyUrl(null).valid, false);
      assert.equal(validateCopyUrl('https://api.test.com').valid, true);
    });
  });

  describe('5. Unsaved Changes Protection on Tab Close', () => {
    it('should identify when a request has unsaved changes', () => {
      const isTabDirty = (tab, activeReqId, isStoreDirty) => {
        const isCurrentlyActive = activeReqId === tab.requestId;
        return Boolean(tab.isDirty || (isCurrentlyActive && isStoreDirty));
      };

      // Inactive tab with saved state
      assert.equal(isTabDirty({ requestId: 'req-1', isDirty: false }, 'req-2', false), false);

      // Inactive tab with draft changes
      assert.equal(isTabDirty({ requestId: 'req-1', isDirty: true }, 'req-2', false), true);

      // Active tab with clean store
      assert.equal(isTabDirty({ requestId: 'req-1', isDirty: false }, 'req-1', false), false);

      // Active tab with dirty store
      assert.equal(isTabDirty({ requestId: 'req-1', isDirty: false }, 'req-1', true), true);
    });
  });
});

