import React, { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Switch from '../../../components/ui/Switch';

export default function TestDialog({
  isOpen,
  onClose,
  onSubmit,
  initialTest = null,
  isSaving = false,
}) {
  if (!isOpen) return null;

  return (
    <TestForm
      key={initialTest?.id || 'new-test'}
      onClose={onClose}
      onSubmit={onSubmit}
      initialTest={initialTest}
      isSaving={isSaving}
    />
  );
}

function TestForm({
  onClose,
  onSubmit,
  initialTest = null,
  isSaving = false,
}) {
  const isEditing = Boolean(initialTest?.id);

  const [name, setName] = useState(initialTest?.name || '');
  const [description, setDescription] = useState(initialTest?.description || '');
  const [enabled, setEnabled] = useState(initialTest?.enabled !== false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!name || !name.trim()) {
      setError('Test name is required');
      return;
    }

    if (name.trim().length > 150) {
      setError('Test name must not exceed 150 characters');
      return;
    }

    if (description && description.trim().length > 500) {
      setError('Description must not exceed 500 characters');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      enabled,
    });
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Test' : 'Create Test'}
      className="bg-[#111318] border-[#232732] max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Test Name <span className="text-rose-400">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Verify Status and User ID"
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Description <span className="text-slate-500 text-[11px]">(Optional)</span>
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of what this test verifies"
            rows={2}
            className="bg-[#181b22] border-[#2b313e] text-slate-200 text-xs focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-300">Enabled</span>
            <span className="text-[11px] text-slate-500">
              Disabled tests will not execute during test runs
            </span>
          </div>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            className={enabled ? 'bg-sky-600' : 'bg-slate-700'}
          />
        </div>

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
            {isSaving ? 'Saving...' : isEditing ? 'Update Test' : 'Create Test'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

