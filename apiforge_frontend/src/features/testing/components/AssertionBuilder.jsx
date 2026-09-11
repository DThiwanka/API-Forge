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
} from '../constants/assertionTypes';

export default function AssertionBuilder({
  isOpen,
  onClose,
  onSubmit,
  initialAssertion = null,
  isSaving = false,
}) {
  if (!isOpen) return null;

  return (
    <AssertionForm
      key={initialAssertion?.id || 'new-assertion'}
      onClose={onClose}
      onSubmit={onSubmit}
      initialAssertion={initialAssertion}
      isSaving={isSaving}
    />
  );
}

function AssertionForm({
  onClose,
  onSubmit,
  initialAssertion = null,
  isSaving = false,
}) {
  const isEditing = Boolean(initialAssertion?.id);

  const [type, setType] = useState(initialAssertion?.type || ASSERTION_TYPES.STATUS);
  const [operator, setOperator] = useState(initialAssertion?.operator || 'equals');
  const [path, setPath] = useState(initialAssertion?.path || '');
  const [expectedValue, setExpectedValue] = useState(() => {
    if (initialAssertion?.expectedValue !== null && initialAssertion?.expectedValue !== undefined) {
      return String(initialAssertion.expectedValue);
    }
    if (initialAssertion?.type === ASSERTION_TYPES.RESPONSE_TIME) return '1000';
    if (initialAssertion?.type === ASSERTION_TYPES.HEADER) return 'application/json';
    return '200';
  });
  const [error, setError] = useState(null);

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
      setExpectedValue('1000');
    } else if (newType === ASSERTION_TYPES.JSON_PATH && !path) {
      setPath('data.id');
    } else if (newType === ASSERTION_TYPES.HEADER && !path) {
      setPath('content-type');
      setExpectedValue('application/json');
    }
  };

  const handleOperatorChange = (newOp) => {
    setOperator(newOp);
    setError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // 1. Path validation
    if (requiresPath(type) && (!path || !path.trim())) {
      setError(`Path is required for ${ASSERTION_TYPE_LABELS[type]}`);
      return;
    }

    // 2. Expected value validation
    const needsValue = requiresExpectedValue(operator);
    if (needsValue && (expectedValue === '' || expectedValue === null || expectedValue === undefined)) {
      setError(`Expected value is required for operator '${OPERATOR_LABELS[operator] || operator}'`);
      return;
    }

    // 3. Numeric validation
    if (needsValue && isNumericValue(type, operator) && isNaN(Number(expectedValue))) {
      setError('Expected value must be a valid number');
      return;
    }

    const payload = {
      type,
      operator,
      path: requiresPath(type) ? path.trim() : null,
      expectedValue: needsValue ? expectedValue.trim() : null,
    };

    onSubmit(payload);
  };

  const availableOperators = ALLOWED_OPERATORS_BY_TYPE[type] || [];
  const needsExpectedValue = requiresExpectedValue(operator);
  const isNumeric = isNumericValue(type, operator);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Assertion' : 'Add Assertion'}
      className="bg-[#111318] border-[#232732] max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

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
        {type === ASSERTION_TYPES.JSON_PATH && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                JSON Path
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                e.g. data.user.id or items[0].name
              </span>
            </div>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="data.user.email"
              className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
              autoFocus
            />
          </div>
        )}

        {type === ASSERTION_TYPES.HEADER && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Header Name
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Case-insensitive
              </span>
            </div>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="content-type"
              className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
              autoFocus
            />
          </div>
        )}

        {/* Operator Select */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Operator
          </label>
          <Select
            value={operator}
            onChange={(e) => handleOperatorChange(e.target.value)}
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
          >
            {availableOperators.map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op] || op}
              </option>
            ))}
          </Select>
        </div>

        {/* Expected Value Input */}
        {needsExpectedValue && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Expected Value {type === ASSERTION_TYPES.RESPONSE_TIME ? '(ms)' : ''}
              </label>
            </div>
            <Input
              type={isNumeric ? 'number' : 'text'}
              value={expectedValue}
              onChange={(e) => setExpectedValue(e.target.value)}
              placeholder={
                type === ASSERTION_TYPES.STATUS
                  ? '200'
                  : type === ASSERTION_TYPES.RESPONSE_TIME
                  ? '1000'
                  : 'Expected value'
              }
              className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs font-mono focus:ring-sky-500"
            />
          </div>
        )}

        {/* Form Actions */}
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
            disabled={isSaving}
            className="text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white"
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update Assertion' : 'Add Assertion'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

