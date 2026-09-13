import React, { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import {
  ASSERTION_TYPES,
  ASSERTION_TYPE_LABELS,
  OPERATOR_LABELS,
  ALLOWED_OPERATORS_BY_TYPE,
  requiresExpectedValue,
  requiresPath,
  isNumericValue,
} from '../../testing/constants/assertionTypes';
import {
  useApiTestsQuery,
  useCreateTestMutation,
} from '../../testing/hooks/useApiTests';
import { createAssertion } from '../../testing/services/testApi';
import { useToastStore } from '../../../stores/toastStore';

export default function CreateTestFromResponseDialog({
  isOpen,
  onClose,
  workspaceId,
  requestId,
  initialAssertion = null,
  initialTestName = '',
}) {
  if (!isOpen) return null;

  return (
    <CreateTestForm
      key={JSON.stringify(initialAssertion) + (requestId || '')}
      onClose={onClose}
      workspaceId={workspaceId}
      requestId={requestId}
      initialAssertion={initialAssertion}
      initialTestName={initialTestName}
    />
  );
}

function CreateTestForm({
  onClose,
  workspaceId,
  requestId,
  initialAssertion = null,
  initialTestName = '',
}) {
  const { data: tests = [], isLoading } = useApiTestsQuery(workspaceId, requestId);
  const createTestMutation = useCreateTestMutation(workspaceId, requestId);

  // Target test state
  const [targetMode, setTargetMode] = useState(tests.length > 0 ? 'existing' : 'new');
  const [selectedTestId, setSelectedTestId] = useState(tests.length > 0 ? tests[0].id : '');
  const [newTestName, setNewTestName] = useState(() => {
    if (initialTestName) return initialTestName;
    if (initialAssertion?.type === ASSERTION_TYPES.STATUS) {
      return `Verify Status ${initialAssertion.expectedValue || 200}`;
    }
    if (initialAssertion?.type === ASSERTION_TYPES.RESPONSE_TIME) {
      return 'Verify Response Time';
    }
    if (initialAssertion?.path) {
      return `Verify ${initialAssertion.path}`;
    }
    return 'Response Verification Test';
  });

  // Assertion fields
  const [type, setType] = useState(initialAssertion?.type || ASSERTION_TYPES.JSON_PATH);
  const [operator, setOperator] = useState(initialAssertion?.operator || 'exists');
  const [path, setPath] = useState(initialAssertion?.path || '');
  const [expectedValue, setExpectedValue] = useState(
    initialAssertion?.expectedValue !== undefined && initialAssertion?.expectedValue !== null
      ? String(initialAssertion.expectedValue)
      : ''
  );

  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveSelectedTestId = selectedTestId || (tests.length > 0 ? tests[0].id : '');

  const handleTypeChange = (newType) => {
    setType(newType);
    setError(null);

    const allowedOps = ALLOWED_OPERATORS_BY_TYPE[newType] || [];
    if (!allowedOps.includes(operator)) {
      setOperator(allowedOps[0] || 'equals');
    }

    if (newType === ASSERTION_TYPES.STATUS) {
      setExpectedValue('200');
    } else if (newType === ASSERTION_TYPES.RESPONSE_TIME) {
      setExpectedValue('500');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (targetMode === 'new' && (!newTestName || !newTestName.trim())) {
      setError('Test name is required');
      return;
    }

    if (requiresPath(type) && (!path || !path.trim())) {
      setError(`Path is required for ${ASSERTION_TYPE_LABELS[type] || 'this assertion'}`);
      return;
    }

    const needsValue = requiresExpectedValue(operator);
    if (needsValue && (expectedValue === '' || expectedValue === null || expectedValue === undefined)) {
      setError(`Expected value is required for operator '${OPERATOR_LABELS[operator] || operator}'`);
      return;
    }

    if (needsValue && isNumericValue(type, operator) && isNaN(Number(expectedValue))) {
      setError('Expected value must be a valid number');
      return;
    }

    setIsSaving(true);

    try {
      let targetId = effectiveSelectedTestId;

      if (targetMode === 'new' || !targetId) {
        const createdTest = await createTestMutation.mutateAsync({
          name: newTestName.trim(),
          enabled: true,
        });
        targetId = createdTest.id;
      }

      // Create assertion via test API client directly
      await createAssertion(workspaceId, requestId, targetId, {
        type,
        operator,
        path: requiresPath(type) ? path.trim() : null,
        expectedValue: needsValue ? expectedValue.trim() : null,
      });

      useToastStore.getState().toast.success('Test assertion created');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create test assertion');
    } finally {
      setIsSaving(false);
    }
  };

  const availableOperators = ALLOWED_OPERATORS_BY_TYPE[type] || [];
  const needsExpectedValue = requiresExpectedValue(operator);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title="Create Test Assertion"
      className="bg-[#111318] border-[#232732] max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Target Test Selection */}
        <div className="space-y-2 pb-2 border-b border-[#232732]">
          <label className="block text-xs font-medium text-slate-300">
            Target Test
          </label>

          {tests.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="targetMode"
                    value="existing"
                    checked={targetMode === 'existing'}
                    onChange={() => setTargetMode('existing')}
                    className="text-sky-500"
                  />
                  <span>Add to existing test</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="targetMode"
                    value="new"
                    checked={targetMode === 'new'}
                    onChange={() => setTargetMode('new')}
                    className="text-sky-500"
                  />
                  <span>Create new test</span>
                </label>
              </div>

              {targetMode === 'existing' ? (
                <Select
                  value={effectiveSelectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
                >
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.assertions?.length || 0} assertions)
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="e.g. Verify Response Payload"
                  className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
                />
              )}
            </div>
          ) : (
            <div>
              <Input
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="e.g. Verify Status and Payload"
                className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                A new test will be created for this request with this assertion.
              </span>
            </div>
          )}
        </div>

        {/* Assertion Type */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Assertion Type
          </label>
          <Select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
          >
            {Object.values(ASSERTION_TYPES).map((t) => (
              <option key={t} value={t}>
                {ASSERTION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>

        {/* Path Input (JSON Path or Header) */}
        {requiresPath(type) && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                {type === ASSERTION_TYPES.HEADER ? 'Header Name' : 'JSON Path'}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {type === ASSERTION_TYPES.HEADER ? 'e.g. content-type' : 'e.g. $.user.id'}
              </span>
            </div>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={type === ASSERTION_TYPES.HEADER ? 'content-type' : '$.data.id'}
              className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
            />
          </div>
        )}

        {/* Operator */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Operator
          </label>
          <Select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op] || op}
              </option>
            ))}
          </Select>
        </div>

        {/* Expected Value */}
        {needsExpectedValue && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Expected Value
            </label>
            <Input
              value={expectedValue}
              onChange={(e) => setExpectedValue(e.target.value)}
              placeholder="e.g. 200, application/json, true"
              className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
            />
          </div>
        )}

        {/* Dialog Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs px-3 py-1.5 bg-[#181b22] hover:bg-[#202531] border border-[#2b313e] text-slate-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || isLoading}
            className="text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white"
          >
            {isSaving ? 'Creating...' : 'Save Assertion'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
