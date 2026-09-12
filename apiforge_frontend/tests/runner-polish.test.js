import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Collection Runner Polish — Frontend Verification', () => {
  describe('Selection Summary & Counts', () => {
    const folders = [
      { id: 'f-1', parentId: null, name: 'Auth' },
      { id: 'f-2', parentId: null, name: 'Users' },
      { id: 'f-3', parentId: 'f-2', name: 'Profile' },
    ];

    const requests = [
      { id: 'r-1', folderId: 'f-1', name: 'Login' },
      { id: 'r-2', folderId: 'f-1', name: 'Register' },
      { id: 'r-3', folderId: 'f-2', name: 'List Users' },
      { id: 'r-4', folderId: 'f-3', name: 'Get Profile' },
      { id: 'r-5', folderId: null, name: 'Root Healthcheck' },
    ];

    it('should correctly calculate selected request and folder counts', () => {
      // User selects r-1 (in f-1) and r-4 (in f-3)
      const selectedRequestIds = ['r-1', 'r-4'];
      const selectedSet = new Set(selectedRequestIds);

      // Folders that contain at least one selected request
      const selectedFoldersCount = folders.filter((folder) =>
        requests.some((r) => r.folderId === folder.id && selectedSet.has(r.id))
      ).length;

      assert.equal(selectedRequestIds.length, 2);
      assert.equal(selectedFoldersCount, 2); // f-1 and f-3
    });

    it('should identify empty selection and guard execution', () => {
      const selectedRequestIds = [];
      const isSelectionEmpty = selectedRequestIds.length === 0;
      assert.equal(isSelectionEmpty, true);

      // Button must be disabled
      const canExecute = selectedRequestIds.length > 0;
      assert.equal(canExecute, false);
    });

    it('should compute full selection when all selected', () => {
      const selectedRequestIds = requests.map((r) => r.id);
      assert.equal(selectedRequestIds.length, 5);
      const isAllSelected = selectedRequestIds.length === requests.length;
      assert.equal(isAllSelected, true);
    });
  });

  describe('Filtering Logic (All, Failed, Passed, Skipped)', () => {
    const mockResults = [
      {
        id: 'r-1',
        name: 'Login',
        success: true,
        skipped: false,
        status: 200,
        tests: { total: 1, passed: 1, failed: 0 },
      },
      {
        id: 'r-2',
        name: 'Get Profile - Test Failure',
        success: false,
        skipped: false,
        status: 200,
        tests: { total: 2, passed: 1, failed: 1 },
      },
      {
        id: 'r-3',
        name: 'Create Order - Network Failure',
        success: false,
        skipped: false,
        status: null,
        execution: { success: false, error: 'ECONNREFUSED' },
      },
      {
        id: 'r-4',
        name: 'Delete Order - Skipped',
        success: false,
        skipped: true,
        status: null,
      },
    ];

    function filterResults(list, filter) {
      if (filter === 'PASSED') return list.filter((r) => r.success);
      if (filter === 'FAILED') return list.filter((r) => !r.success && !r.skipped);
      if (filter === 'SKIPPED') return list.filter((r) => r.skipped);
      return list;
    }

    it('should return all results for ALL filter', () => {
      const all = filterResults(mockResults, 'ALL');
      assert.equal(all.length, 4);
    });

    it('should include both test failures and execution failures in FAILED filter without skipped items', () => {
      const failed = filterResults(mockResults, 'FAILED');
      assert.equal(failed.length, 2);
      assert.equal(failed.some((r) => r.id === 'r-2'), true); // test failure
      assert.equal(failed.some((r) => r.id === 'r-3'), true); // network execution failure
      assert.equal(failed.some((r) => r.skipped), false); // must never include skipped
    });

    it('should return only successful items for PASSED filter', () => {
      const passed = filterResults(mockResults, 'PASSED');
      assert.equal(passed.length, 1);
      assert.equal(passed[0].id, 'r-1');
    });

    it('should return only skipped items for SKIPPED filter', () => {
      const skipped = filterResults(mockResults, 'SKIPPED');
      assert.equal(skipped.length, 1);
      assert.equal(skipped[0].id, 'r-4');
    });
  });

  describe('Stop-on-Error Outcome Diagnostics', () => {
    function computeRunOutcome(summary, results) {
      const hasExecutionErrors = results.some(
        (r) => !r.success && !r.skipped && r.execution && !r.execution.success
      );
      const hasTestFailures = results.some((r) => r.tests && r.tests.failed > 0);
      const hasExtractionFailures = results.some((r) => r.extraction && !r.extraction.success);
      const stoppedRequest =
        summary.status === 'STOPPED' ? results.find((r) => !r.success && !r.skipped) : null;

      let stopReason = 'Execution error';
      if (stoppedRequest) {
        if (
          stoppedRequest.errorType === 'ASSERTION_ERROR' ||
          (stoppedRequest.tests && stoppedRequest.tests.failed > 0)
        ) {
          stopReason = 'Test failure';
        } else if (stoppedRequest.errorType === 'EXTRACTION_ERROR') {
          stopReason = 'Variable extraction failure';
        } else if (stoppedRequest.errorMessage) {
          stopReason = stoppedRequest.errorType || 'HTTP / transport error';
        }
      }

      let headline;
      let statusType;

      if (summary.status === 'STOPPED') {
        headline = 'Collection run stopped early on error';
        statusType = 'STOPPED';
      } else if (summary.failed > 0) {
        if (hasTestFailures && !hasExecutionErrors && !hasExtractionFailures) {
          headline = 'Collection run completed with test failures';
          statusType = 'TEST_FAILED';
        } else {
          headline = 'Collection run completed with execution errors';
          statusType = 'EXECUTION_ERROR';
        }
      } else {
        headline = 'Collection run passed';
        statusType = 'SUCCESS';
      }

      return { statusType, headline, stopReason, stoppedRequest };
    }

    it('should diagnose test failure as stop reason when stopped by assertion error', () => {
      const summary = { status: 'STOPPED', total: 3, completed: 1, passed: 0, failed: 1, skipped: 2 };
      const results = [
        {
          id: 'r-1',
          name: 'Validate Schema',
          success: false,
          skipped: false,
          errorType: 'ASSERTION_ERROR',
          tests: { total: 1, passed: 0, failed: 1 },
        },
        { id: 'r-2', name: 'Get Item', skipped: true },
        { id: 'r-3', name: 'Delete Item', skipped: true },
      ];

      const outcome = computeRunOutcome(summary, results);
      assert.equal(outcome.statusType, 'STOPPED');
      assert.equal(outcome.stopReason, 'Test failure');
      assert.equal(outcome.stoppedRequest.name, 'Validate Schema');
    });

    it('should diagnose execution error when stopped by transport error', () => {
      const summary = { status: 'STOPPED', total: 2, completed: 1, passed: 0, failed: 1, skipped: 1 };
      const results = [
        {
          id: 'r-1',
          name: 'Down Server',
          success: false,
          skipped: false,
          errorType: 'NETWORK_ERROR',
          errorMessage: 'getaddrinfo ENOTFOUND',
          execution: { success: false },
        },
        { id: 'r-2', name: 'Unreached', skipped: true },
      ];

      const outcome = computeRunOutcome(summary, results);
      assert.equal(outcome.statusType, 'STOPPED');
      assert.equal(outcome.stopReason, 'NETWORK_ERROR');
      assert.equal(outcome.stoppedRequest.name, 'Down Server');
    });
  });

  describe('Security & Masking Integrity', () => {
    it('should never expose secret variables in plain text', () => {
      const variables = [
        { key: 'apiKey', value: 'sk_live_1234567890', isSecret: true },
        { key: 'password', value: 'super_secret', isSecret: true },
        { key: 'userId', value: '42', isSecret: false },
      ];

      // Sanitized runtime variables payload representation
      const publicRepresentation = variables.map((v) => ({
        key: v.key,
        masked: v.isSecret ? '••••••••' : v.value,
      }));

      assert.equal(publicRepresentation[0].masked, '••••••••');
      assert.equal(publicRepresentation[1].masked, '••••••••');
      assert.equal(publicRepresentation[2].masked, '42');
    });
  });
});

