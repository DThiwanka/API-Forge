import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCreateWorkspaceMutation } from '../hooks/useWorkspace';
import useWorkspaceStore from '../store/workspaceStore';
import { toast } from '../../../stores/toastStore';

export default function CreateWorkspaceDialog({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  const createMutation = useCreateWorkspaceMutation();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Workspace name is required');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      if (created?.id) {
        setActiveWorkspaceId(created.id);
      }

      setName('');
      setDescription('');
      setError(null);
      toast.success(`Workspace "${trimmedName}" created successfully`);

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create workspace');
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create New Workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="create-workspace-name" className="block text-xs font-medium text-slate-300 mb-1">
            Workspace Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="create-workspace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Core API, Payments, Mobile Backend"
            maxLength={100}
            autoFocus
            required
            aria-required="true"
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div>
          <label htmlFor="create-workspace-description" className="block text-xs font-medium text-slate-300 mb-1">
            Description <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="create-workspace-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this workspace's purpose"
            rows={3}
            maxLength={300}
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

