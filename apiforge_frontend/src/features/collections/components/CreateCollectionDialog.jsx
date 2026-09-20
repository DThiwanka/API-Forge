import { useState } from 'react';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCreateCollectionMutation } from '../hooks/useCollections';
import useCollectionStore from '../store/collectionStore';

export default function CreateCollectionDialog({ isOpen, onClose, workspaceId, onSuccess, subtitle }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);

  const createMutation = useCreateCollectionMutation(workspaceId);
  const expandCollection = useCollectionStore((s) => s.expandCollection);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!workspaceId) {
      setError('A workspace is required to create a collection');
      return;
    }
    if (!trimmedName) {
      setError('Collection name is required');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
      });
      if (created?.id) {
        expandCollection(created.id);
      }
      setName('');
      setDescription('');
      setError(null);
      onClose();
      if (onSuccess && created) {
        onSuccess(created);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create collection');
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Create New Collection">
      {subtitle && (
        <p className="text-xs text-slate-400 -mt-2 mb-3 leading-relaxed">
          {subtitle}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="create-collection-name" className="block text-xs font-medium text-slate-300 mb-1">
            Collection Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="create-collection-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Authentication API, Payments, Users"
            maxLength={150}
            autoFocus
            required
            aria-required="true"
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div>
          <label htmlFor="create-collection-desc" className="block text-xs font-medium text-slate-300 mb-1">
            Description <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="create-collection-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what APIs are organized in this collection..."
            rows={3}
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans resize-none"
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
            {createMutation.isPending ? 'Creating...' : 'Create Collection'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

