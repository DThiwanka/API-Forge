import React, { useState } from 'react';
import { Plus, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import TestItem from './TestItem';
import TestDialog from './TestDialog';
import {
  useApiTestsQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
} from '../hooks/useApiTests';

export default function TestPanel({ workspaceId, requestId, readOnly = false }) {
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [deletingTest, setDeletingTest] = useState(null);

  const {
    data: tests = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useApiTestsQuery(workspaceId, requestId);

  const createTestMutation = useCreateTestMutation(workspaceId, requestId);
  const updateTestMutation = useUpdateTestMutation(workspaceId, requestId);
  const deleteTestMutation = useDeleteTestMutation(workspaceId, requestId);

  // Handle save test (create or update)
  const handleSaveTest = (payload) => {
    if (editingTest) {
      updateTestMutation.mutate(
        { testId: editingTest.id, ...payload },
        {
          onSuccess: () => {
            setIsTestDialogOpen(false);
            setEditingTest(null);
          },
        }
      );
    } else {
      createTestMutation.mutate(payload, {
        onSuccess: () => {
          setIsTestDialogOpen(false);
        },
      });
    }
  };

  // Handle delete test confirmation
  const handleConfirmDelete = () => {
    if (!deletingTest) return;
    deleteTestMutation.mutate(deletingTest.id, {
      onSuccess: () => {
        setDeletingTest(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#0d0f14]">
        <Loader2 size={24} className="animate-spin text-sky-500 mb-2" />
        <span className="text-xs font-mono">Loading tests...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#0d0f14]">
        <AlertCircle size={24} className="text-rose-400 mb-2" />
        <span className="text-xs font-mono text-rose-300 mb-3">
          Failed to load tests: {error?.message || 'Unknown error'}
        </span>
        <Button
          variant="secondary"
          onClick={() => refetch()}
          className="text-xs px-3 py-1 bg-[#181b22] border border-[#2b313e]"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0f14] overflow-y-auto p-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1c202a]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">
            Request Tests
          </h3>
          <span className="px-2 py-0.2 rounded-full text-[11px] font-mono bg-[#181b22] border border-[#2b313e] text-sky-400 font-semibold">
            {tests.length}
          </span>
        </div>

        {!readOnly && (
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setEditingTest(null);
              setIsTestDialogOpen(true);
            }}
            className="text-xs px-3 py-1.5 h-7 gap-1.5 bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
          >
            <Plus size={13} />
            <span>Add Test</span>
          </Button>
        )}
      </div>

      {/* Test List or Empty State */}
      {tests.length > 0 ? (
        <div className="flex flex-col gap-3">
          {tests.map((test) => (
            <TestItem
              key={test.id}
              test={test}
              workspaceId={workspaceId}
              requestId={requestId}
              onEditTest={
                readOnly
                  ? undefined
                  : (t) => {
                      setEditingTest(t);
                      setIsTestDialogOpen(true);
                    }
              }
              onDeleteTest={
                readOnly ? undefined : (t) => setDeletingTest(t)
              }
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-12 h-12 rounded-full bg-[#181b22] border border-[#232732] flex items-center justify-center text-sky-400 mb-3 shadow-inner">
            <ShieldCheck size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-200 mb-1">
            No tests yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
            Define automated assertions to verify response status codes, payload structure, headers, and execution latency.
          </p>
          {!readOnly && (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setEditingTest(null);
                setIsTestDialogOpen(true);
              }}
              className="text-xs px-3.5 py-1.5 gap-1.5 bg-sky-600 hover:bg-sky-500 text-white"
            >
              <Plus size={13} />
              <span>Add First Test</span>
            </Button>
          )}
        </div>
      )}

      {/* Create / Edit Test Dialog */}
      {isTestDialogOpen && (
        <TestDialog
          isOpen={isTestDialogOpen}
          onClose={() => {
            setIsTestDialogOpen(false);
            setEditingTest(null);
          }}
          onSubmit={handleSaveTest}
          initialTest={editingTest}
          isSaving={
            createTestMutation.isPending || updateTestMutation.isPending
          }
        />
      )}

      {/* Delete Test Confirmation Dialog */}
      {deletingTest && (
        <ConfirmDialog
          isOpen={Boolean(deletingTest)}
          onClose={() => setDeletingTest(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Test"
          message={`Are you sure you want to delete test "${deletingTest.name}"? All assertions within this test will also be deleted.`}
        />
      )}
    </div>
  );
}

