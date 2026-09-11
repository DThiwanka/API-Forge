import React, { useState } from 'react';
import { Play, Loader2, Pencil, Trash2, Plus, FileQuestion } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Switch from '../../../components/ui/Switch';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import AssertionRow from './AssertionRow';
import AssertionBuilder from './AssertionBuilder';
import TestResult from './TestResult';
import {
  useUpdateTestMutation,
  useRunTestMutation,
  useCreateAssertionMutation,
  useUpdateAssertionMutation,
  useDeleteAssertionMutation,
} from '../hooks/useApiTests';

export default function TestItem({
  test,
  workspaceId,
  requestId,
  onEditTest,
  onDeleteTest,
  readOnly = false,
}) {
  const [testResult, setTestResult] = useState(null);
  const [isAssertionBuilderOpen, setIsAssertionBuilderOpen] = useState(false);
  const [editingAssertion, setEditingAssertion] = useState(null);
  const [deletingAssertion, setDeletingAssertion] = useState(null);

  const updateTestMutation = useUpdateTestMutation(workspaceId, requestId);
  const runTestMutation = useRunTestMutation(workspaceId, requestId);
  const createAssertionMutation = useCreateAssertionMutation(workspaceId, requestId, test.id);
  const updateAssertionMutation = useUpdateAssertionMutation(workspaceId, requestId, test.id);
  const deleteAssertionMutation = useDeleteAssertionMutation(workspaceId, requestId, test.id);

  const assertions = (test.assertions || []).slice().sort((a, b) => a.position - b.position);
  const isEnabled = test.enabled !== false;
  const isRunning = runTestMutation.isPending;

  // Toggle enabled
  const handleToggleEnabled = (checked) => {
    updateTestMutation.mutate({ testId: test.id, enabled: checked });
  };

  // Run test
  const handleRun = () => {
    if (!isEnabled || assertions.length === 0 || isRunning) return;
    runTestMutation.mutate(
      { testId: test.id },
      {
        onSuccess: (data) => {
          setTestResult(data);
        },
        onError: (err) => {
          const resData = err.response?.data;
          setTestResult({
            testId: test.id,
            testName: test.name,
            requestId,
            passed: false,
            total: assertions.length,
            passedCount: 0,
            failedCount: assertions.length,
            duration: 0,
            errorType: 'UNKNOWN',
            errorMessage: resData?.message || err.message || 'Execution failed',
            assertions: [],
          });
        },
      }
    );
  };

  // Create or update assertion
  const handleSaveAssertion = (payload) => {
    if (editingAssertion) {
      updateAssertionMutation.mutate(
        { assertionId: editingAssertion.id, ...payload },
        {
          onSuccess: () => {
            setIsAssertionBuilderOpen(false);
            setEditingAssertion(null);
          },
        }
      );
    } else {
      createAssertionMutation.mutate(payload, {
        onSuccess: () => {
          setIsAssertionBuilderOpen(false);
        },
      });
    }
  };

  // Delete assertion
  const handleConfirmDeleteAssertion = () => {
    if (!deletingAssertion) return;
    deleteAssertionMutation.mutate(deletingAssertion.id, {
      onSuccess: () => {
        setDeletingAssertion(null);
      },
    });
  };

  return (
    <div
      className={`rounded-lg border bg-[#111318] p-4 transition-all ${
        isEnabled
          ? 'border-[#232732] hover:border-[#2f3545]'
          : 'border-[#1e2129] opacity-75 bg-[#0f1115]'
      }`}
    >
      {/* Test Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c202a]">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-100 truncate">
                {test.name}
              </h4>
              {!isEnabled && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                  Disabled
                </span>
              )}
            </div>
            {test.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {test.description}
              </p>
            )}
          </div>
        </div>

        {/* Header Actions: Switch, Run, Edit, Delete */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Enabled Switch */}
          {!readOnly && (
            <div className="flex items-center gap-1.5 mr-2">
              <Switch
                checked={isEnabled}
                onChange={handleToggleEnabled}
                className={isEnabled ? 'bg-sky-600' : 'bg-slate-700'}
                title={isEnabled ? 'Disable test' : 'Enable test'}
              />
            </div>
          )}

          {/* Run Button */}
          <Button
            type="button"
            variant="primary"
            onClick={handleRun}
            disabled={!isEnabled || assertions.length === 0 || isRunning || readOnly}
            className={`text-xs px-2.5 py-1.5 h-7 font-medium gap-1.5 ${
              isEnabled && assertions.length > 0
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
            title={
              !isEnabled
                ? 'Test is disabled'
                : assertions.length === 0
                ? 'Add assertions to run test'
                : 'Execute test and verify assertions'
            }
          >
            {isRunning ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={11} fill="currentColor" />
                <span>Run Test</span>
              </>
            )}
          </Button>

          {/* Edit Test */}
          {!readOnly && onEditTest && (
            <button
              type="button"
              onClick={() => onEditTest(test)}
              className="p-1.5 rounded text-slate-400 hover:text-sky-300 hover:bg-[#181b22] border border-transparent hover:border-[#2b313e] transition-colors"
              title="Edit Test Definition"
              aria-label="Edit Test Definition"
            >
              <Pencil size={13} />
            </button>
          )}

          {/* Delete Test */}
          {!readOnly && onDeleteTest && (
            <button
              type="button"
              onClick={() => onDeleteTest(test)}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-[#181b22] border border-transparent hover:border-[#2b313e] transition-colors"
              title="Delete Test"
              aria-label="Delete Test"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Test Execution Result Banner */}
      <div className="mt-3">
        {testResult && (
          <TestResult
            result={testResult}
            onDismiss={() => setTestResult(null)}
          />
        )}
      </div>

      {/* Assertions Section */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Assertions ({assertions.length})
            </span>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setEditingAssertion(null);
                setIsAssertionBuilderOpen(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              <Plus size={12} />
              <span>Add Assertion</span>
            </button>
          )}
        </div>

        {/* Assertions List */}
        {assertions.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {assertions.map((assertion) => {
              const res = testResult?.assertions?.find(
                (a) => a.assertionId === assertion.id
              );
              return (
                <AssertionRow
                  key={assertion.id}
                  assertion={assertion}
                  result={res}
                  onEdit={
                    readOnly
                      ? undefined
                      : (a) => {
                          setEditingAssertion(a);
                          setIsAssertionBuilderOpen(true);
                        }
                  }
                  onDelete={
                    readOnly ? undefined : (a) => setDeletingAssertion(a)
                  }
                  readOnly={readOnly}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-4 px-3 rounded border border-dashed border-[#232732] bg-[#0c0e12] flex flex-col items-center justify-center text-center">
            <FileQuestion size={20} className="text-slate-500 mb-1" />
            <p className="text-xs text-slate-400 font-medium">No assertions defined</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Add assertions to verify response status, headers, JSON paths, or payload.
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  setEditingAssertion(null);
                  setIsAssertionBuilderOpen(true);
                }}
                className="mt-2 text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
              >
                <Plus size={12} />
                <span>Add Assertion</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Assertion Builder Modal */}
      {isAssertionBuilderOpen && (
        <AssertionBuilder
          isOpen={isAssertionBuilderOpen}
          onClose={() => {
            setIsAssertionBuilderOpen(false);
            setEditingAssertion(null);
          }}
          onSubmit={handleSaveAssertion}
          initialAssertion={editingAssertion}
          isSaving={
            createAssertionMutation.isPending || updateAssertionMutation.isPending
          }
        />
      )}

      {/* Delete Assertion Confirmation Dialog */}
      {deletingAssertion && (
        <ConfirmDialog
          isOpen={Boolean(deletingAssertion)}
          onClose={() => setDeletingAssertion(null)}
          onConfirm={handleConfirmDeleteAssertion}
          title="Delete Assertion"
          message={`Are you sure you want to delete this assertion (${deletingAssertion.type})?`}
        />
      )}
    </div>
  );
}

