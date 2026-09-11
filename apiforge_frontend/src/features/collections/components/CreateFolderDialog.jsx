import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCreateFolderMutation } from '../hooks/useCollections';
import useCollectionStore from '../store/collectionStore';

export default function CreateFolderDialog({
  isOpen,
  onClose,
  workspaceId,
  collectionId,
  parentId = null,
  parentName = null,
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const createMutation = useCreateFolderMutation(workspaceId, collectionId);
  const expandFolder = useCollectionStore((s) => s.expandFolder);
  const expandCollection = useCollectionStore((s) => s.expandCollection);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Folder name is required');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        parentId: parentId || undefined,
      });

      if (parentId) {
        expandFolder(parentId);
      } else if (collectionId) {
        expandCollection(collectionId);
      }
      if (created?.id) {
        expandFolder(created.id);
      }

      setName('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={parentName ? `New Folder in "${parentName}"` : 'New Folder'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Folder Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Authentication, V1 Endpoints, Webhooks"
            maxLength={100}
            autoFocus
            required
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending || !name.trim()}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

