import { useState, useEffect } from 'react';
import { X, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { useUpdateEnvironmentMutation } from '../hooks/useEnvironments';

export default function EditEnvironmentDialog({
  isOpen,
  onClose,
  workspaceId,
  environment,
  onUpdated,
}) {
  if (!isOpen || !environment) return null;

  return (
    <EditEnvironmentForm
      onClose={onClose}
      workspaceId={workspaceId}
      environment={environment}
      onUpdated={onUpdated}
    />
  );
}

function EditEnvironmentForm({ onClose, workspaceId, environment, onUpdated }) {
  const [name, setName] = useState(environment.name || '');
  const [description, setDescription] = useState(environment.description || '');
  const [errorMessage, setErrorMessage] = useState('');

  const updateMutation = useUpdateEnvironmentMutation(workspaceId);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Environment name is required');
      return;
    }

    setErrorMessage('');
    updateMutation.mutate(
      {
        environmentId: environment.id,
        name: trimmedName,
        description: description.trim() || null,
      },
      {
        onSuccess: (updated) => {
          if (onUpdated) onUpdated(updated);
          onClose();
        },
        onError: (err) => {
          const status = err?.response?.status;
          if (status === 409) {
            setErrorMessage(`Environment '${trimmedName}' already exists in this workspace`);
          } else if (status === 403) {
            setErrorMessage('You do not have permission to edit environments (Admin required)');
          } else {
            setErrorMessage(err?.response?.data?.message || err.message || 'Failed to update environment');
          }
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-md rounded-xl bg-[#14171f] border border-[#2b313e] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#232732] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Edit2 size={15} className="text-sky-400" />
            <span>Edit Environment</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#232732] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMessage && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Environment Name <span className="text-rose-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Development, Staging, Production"
              className="w-full px-3 py-1.5 rounded-md bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Description <span className="text-slate-500 text-[10px]">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this environment's purpose"
              className="w-full px-3 py-1.5 rounded-md bg-[#181b22] border border-[#2b313e] focus:border-sky-500 focus:outline-none text-xs text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#232732]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
            >
              {updateMutation.isPending && <Loader2 size={12} className="animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

