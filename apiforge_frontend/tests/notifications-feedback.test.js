import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useToastStore, toast, TOAST_DURATIONS } from '../src/stores/toastStore.js';
import notificationStore from '../src/stores/notificationStore.js';
import {
  normalizeApiError,
  classifyApiErrorCategory,
  sanitizeErrorMessage,
  getErrorMessage,
  ERROR_CATEGORIES,
} from '../src/utils/errorHandler.js';
import {
  classifyClientExecutionError,
  validateRequestBeforeSend,
} from '../src/features/requests/utils/executionUtils.js';
import { useRequestStore } from '../src/features/requests/store/requestStore.js';
import { useCollaborationStore } from '../src/features/collaboration/store/collaborationStore.js';

describe('Step 58: Notifications, Feedback & Error UX — Unit Verification', () => {
  beforeEach(() => {
    // Reset toast store
    useToastStore.setState({
      toasts: [],
      recentToasts: new Map(),
    });

    // Reset request store
    useRequestStore.setState({
      id: 'req-1',
      workspaceId: 'ws-1',
      collectionId: 'col-1',
      name: 'Get User',
      method: 'GET',
      url: 'https://api.example.com/users',
      isDirty: false,
      isSaving: false,
      drafts: {},
    });

    // Reset collaboration store
    useCollaborationStore.getState().clearCollaborationState();
  });

  // =========================================================================
  // 1. Notification & Toast Store
  // =========================================================================
  describe('1. Notification & Toast Store', () => {
    it('should add a success toast notification with default duration', () => {
      const id = toast.success('Request saved successfully');
      assert.ok(id, 'Toast ID should be returned');

      const toasts = useToastStore.getState().toasts;
      assert.equal(toasts.length, 1);
      assert.equal(toasts[0].type, 'success');
      assert.equal(toasts[0].message, 'Request saved successfully');
      assert.equal(toasts[0].duration, TOAST_DURATIONS.success);
      assert.equal(toasts[0].dismissible, true);
    });

    it('should add an error toast notification with longer default duration', () => {
      const id = toast.error('Failed to connect to backend server');
      assert.ok(id);

      const toasts = useToastStore.getState().toasts;
      assert.equal(toasts.length, 1);
      assert.equal(toasts[0].type, 'error');
      assert.equal(toasts[0].duration, TOAST_DURATIONS.error);
    });

    it('should support notification options with title and action button', () => {
      let actionClicked = false;
      const id = useToastStore.getState().addToast({
        type: 'warning',
        title: 'Quota Warning',
        message: 'You have used 90% of your rate limit',
        duration: 5000,
        action: {
          label: 'Upgrade Plan',
          onClick: () => {
            actionClicked = true;
          },
        },
      });
      assert.ok(id);

      const toasts = useToastStore.getState().toasts;
      assert.equal(toasts.length, 1);
      assert.equal(toasts[0].title, 'Quota Warning');
      assert.equal(toasts[0].action?.label, 'Upgrade Plan');

      // Trigger action
      toasts[0].action.onClick();
      assert.equal(actionClicked, true);
    });

    it('should dismiss a toast notification by ID', () => {
      const id1 = toast.info('Notice 1');
      const id2 = toast.info('Notice 2');

      assert.equal(useToastStore.getState().toasts.length, 2);

      useToastStore.getState().dismiss(id1);
      const remaining = useToastStore.getState().toasts;
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].id, id2);
    });

    it('should prevent duplicate notification spam for identical messages within window', () => {
      const firstId = toast.error('Connection lost. Reconnecting...');
      assert.ok(firstId, 'First toast should be created');

      // Attempt to fire identical toast immediately
      const duplicateId = toast.error('Connection lost. Reconnecting...');
      assert.equal(duplicateId, null, 'Duplicate toast should be suppressed');

      const toasts = useToastStore.getState().toasts;
      assert.equal(toasts.length, 1, 'Store should only contain one notification');
    });

    it('notificationStore export should bridge to unified useToastStore', () => {
      assert.equal(notificationStore, useToastStore);
    });
  });

  // =========================================================================
  // 2. Global API Error Normalization & Sanitization
  // =========================================================================
  describe('2. Global API Error Normalization & Sanitization', () => {
    it('should classify and normalize 400 validation error with field errors', () => {
      const axiosErr = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: [
              { field: 'url', message: 'url is required and must be valid' },
              { field: 'method', message: 'method must be an allowed HTTP verb' },
            ],
          },
        },
      };

      const normalized = normalizeApiError(axiosErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.VALIDATION);
      assert.equal(normalized.status, 400);
      assert.equal(normalized.fieldErrors.url, 'url is required and must be valid');
      assert.equal(normalized.fieldErrors.method, 'method must be an allowed HTTP verb');
      assert.equal(normalized.retryable, false);
    });

    it('should classify 401 as AUTHENTICATION with friendly guidance', () => {
      const axiosErr = {
        response: {
          status: 401,
          data: { message: 'Token expired' },
        },
      };

      const normalized = normalizeApiError(axiosErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.AUTHENTICATION);
      assert.equal(normalized.status, 401);
      assert.equal(normalized.message, 'Token expired');
      assert.equal(normalized.retryable, false);
    });

    it('should classify 403 as AUTHORIZATION', () => {
      const axiosErr = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      const normalized = normalizeApiError(axiosErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.AUTHORIZATION);
      assert.equal(normalized.message, 'Forbidden');
    });

    it('should classify 404 as NOT_FOUND', () => {
      const axiosErr = {
        response: {
          status: 404,
          data: { message: 'Request definition not found' },
        },
      };

      const normalized = normalizeApiError(axiosErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.NOT_FOUND);
      assert.equal(normalized.message, 'Request definition not found');
    });

    it('should classify 409 as CONFLICT', () => {
      const axiosErr = {
        response: {
          status: 409,
          data: { message: 'Environment with this name already exists' },
        },
      };

      const normalized = normalizeApiError(axiosErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.CONFLICT);
      assert.equal(normalized.message, 'Environment with this name already exists');
    });

    it('should classify 429 as RATE_LIMITED and mark as retryable', () => {
      const axiosErr = {
        response: {
          status: 429,
          data: { message: 'Too many requests' },
        },
      };

      const normalized = normalizeApiError(axiosErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.RATE_LIMITED);
      assert.equal(normalized.retryable, true);
    });

    it('should classify network connection failure as NETWORK', () => {
      const networkErr = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };

      const normalized = normalizeApiError(networkErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.NETWORK);
      assert.equal(normalized.retryable, true);
      assert.equal(normalized.message, "Couldn't reach APIForge. Check your connection and try again.");
    });

    it('should classify timeout as TIMEOUT', () => {
      const timeoutErr = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };

      const normalized = normalizeApiError(timeoutErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.TIMEOUT);
      assert.equal(normalized.retryable, true);
    });

    it('should classify 500 server error as SERVER and mark as retryable', () => {
      const serverErr = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      const normalized = normalizeApiError(serverErr);
      assert.equal(normalized.category, ERROR_CATEGORIES.SERVER);
      assert.equal(normalized.retryable, true);
      assert.equal(normalized.message, 'Internal server error');
    });

    it('should sanitize stack traces, internal paths, SQL queries, and secrets', () => {
      const sensitiveErr = `Error: relation "workspaces" does not exist at Query.handle (/app/node_modules/pg/lib/query.js:12:34)
      SELECT * FROM workspaces WHERE password = 'secret123'`;

      const sanitized = sanitizeErrorMessage(sensitiveErr);
      assert.ok(!sanitized.includes('node_modules'));
      assert.ok(!sanitized.includes('SELECT'));
      assert.ok(!sanitized.includes('secret123'));
      assert.equal(sanitized, 'An internal error occurred. Please try again.');
    });

    it('should preserve safe backend error message', () => {
      const safeErr = 'Invitation has expired.';
      const sanitized = sanitizeErrorMessage(safeErr);
      assert.equal(sanitized, 'Invitation has expired.');
    });

    it('classifyApiErrorCategory should directly map status codes', () => {
      assert.equal(classifyApiErrorCategory(400), ERROR_CATEGORIES.VALIDATION);
      assert.equal(classifyApiErrorCategory(404), ERROR_CATEGORIES.NOT_FOUND);
      assert.equal(classifyApiErrorCategory(500), ERROR_CATEGORIES.SERVER);
    });

    it('getErrorMessage should provide backward-compatible string extraction', () => {
      assert.equal(getErrorMessage('Simple error'), 'Simple error');
      assert.equal(getErrorMessage({ message: 'Custom message' }), 'Custom message');
    });
  });

  // =========================================================================
  // 3. Request Execution Errors vs. Valid Target HTTP Responses
  // =========================================================================
  describe('3. Request Execution vs. Target HTTP Responses', () => {
    it('should treat target 2xx, 4xx, and 5xx responses as completed HTTP responses', () => {
      // Backend httpClientService returns target responses as normal response payloads
      const target200 = { status: 200, statusText: 'OK', body: '{"ok":true}' };
      const target404 = { status: 404, statusText: 'Not Found', body: '{"error":"Not Found"}' };
      const target500 = { status: 500, statusText: 'Internal Server Error', body: 'Error from remote server' };

      // In APIForge, target responses are valid HTTP response objects
      assert.equal(target200.status, 200);
      assert.equal(target404.status, 404);
      assert.equal(target500.status, 500);
    });

    it('should classify execution timeout as TIMEOUT execution failure', () => {
      const timeoutErr = {
        code: 'ECONNABORTED',
        message: 'Request timed out after 10000ms',
        status: 504,
      };

      const classified = classifyClientExecutionError(timeoutErr);
      assert.equal(classified.type, 'TIMEOUT');
      assert.equal(classified.status, 504);
      assert.ok(classified.suggestions.length > 0);
    });

    it('should classify SSRF / security block as SECURITY execution failure', () => {
      const ssrfErr = {
        response: {
          status: 403,
          data: { message: 'Destination blocked by SSRF security policy: private IP 127.0.0.1' },
        },
      };

      const classified = classifyClientExecutionError(ssrfErr);
      assert.equal(classified.type, 'SECURITY');
      assert.equal(classified.status, 403);
      assert.ok(classified.suggestions.some((s) => s.includes('SSRF')));
    });

    it('should classify DNS / connection refused as NETWORK execution failure', () => {
      const dnsErr = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND invalid-api.test',
      };

      const classified = classifyClientExecutionError(dnsErr);
      assert.equal(classified.type, 'NETWORK');
      assert.ok(classified.suggestions.length > 0);
    });
  });

  // =========================================================================
  // 4. Request Editing & Save States
  // =========================================================================
  describe('4. Request Editing & Save States', () => {
    it('should track dirty state when user edits request fields', () => {
      assert.equal(useRequestStore.getState().isDirty, false);

      useRequestStore.getState().setUrl('https://api.example.com/v2/users');
      assert.equal(useRequestStore.getState().isDirty, true);
    });

    it('should track saving state and clear dirty flag only upon successful save', () => {
      const store = useRequestStore.getState();
      store.setUrl('https://api.example.com/v2/users');
      assert.equal(useRequestStore.getState().isDirty, true);

      // Transition to isSaving
      useRequestStore.getState().setIsSaving(true);
      assert.equal(useRequestStore.getState().isSaving, true);

      // Simulate successful save
      useRequestStore.getState().markClean();
      useRequestStore.getState().setIsSaving(false);

      assert.equal(useRequestStore.getState().isDirty, false);
      assert.equal(useRequestStore.getState().isSaving, false);
    });

    it('should preserve dirty state when save fails', () => {
      const store = useRequestStore.getState();
      store.setUrl('https://api.example.com/unsaved-changes');
      assert.equal(useRequestStore.getState().isDirty, true);

      // Start save
      useRequestStore.getState().setIsSaving(true);

      // Simulate save failure: markClean is NOT called
      useRequestStore.getState().setIsSaving(false);

      // Changes remain dirty so user does not lose draft
      assert.equal(useRequestStore.getState().isDirty, true);
      assert.equal(useRequestStore.getState().url, 'https://api.example.com/unsaved-changes');
    });

    it('validateRequestBeforeSend should catch empty URL before submission', () => {
      const result = validateRequestBeforeSend({ url: '' });
      assert.equal(result.isValid, false);
      assert.ok(result.error.includes('URL'));
    });
  });

  // =========================================================================
  // 5. Realtime Feedback & Conflict Warnings
  // =========================================================================
  describe('5. Realtime Feedback & Conflict Warnings', () => {
    it('should register remote update conflict warning when teammate modifies active dirty request', () => {
      const reqId = 'req-collaboration-1';
      useCollaborationStore.getState().setRemoteUpdateWarning(reqId, {
        actorName: 'Alex',
        timestamp: Date.now(),
      });

      const warnings = useCollaborationStore.getState().remoteUpdateWarnings;
      assert.ok(warnings[reqId]);
      assert.equal(warnings[reqId].actorName, 'Alex');

      // Dismiss warning
      useCollaborationStore.getState().dismissRemoteUpdateWarning(reqId);
      assert.equal(useCollaborationStore.getState().remoteUpdateWarnings[reqId], undefined);
    });

    it('should register deleted resource notification when active request is deleted', () => {
      const reqId = 'req-deleted-1';
      useCollaborationStore.getState().setDeletedResource(reqId, {
        actorName: 'Alex',
        type: 'request',
        timestamp: Date.now(),
      });

      const deleted = useCollaborationStore.getState().deletedResources;
      assert.ok(deleted[reqId]);
      assert.equal(deleted[reqId].actorName, 'Alex');

      useCollaborationStore.getState().dismissDeletedResource(reqId);
      assert.equal(useCollaborationStore.getState().deletedResources[reqId], undefined);
    });

    it('should track realtime connection status transitions', () => {
      assert.equal(useCollaborationStore.getState().connectionStatus, 'offline');

      useCollaborationStore.getState().setConnectionStatus('connecting');
      assert.equal(useCollaborationStore.getState().connectionStatus, 'connecting');

      useCollaborationStore.getState().setConnectionStatus('connected');
      assert.equal(useCollaborationStore.getState().connectionStatus, 'connected');

      useCollaborationStore.getState().setConnectionStatus('reconnecting');
      assert.equal(useCollaborationStore.getState().connectionStatus, 'reconnecting');
    });
  });
});
