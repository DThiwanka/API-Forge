import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCreateRequestMutation } from '../../requests/hooks/useRequest';
import useCollectionStore from '../store/collectionStore';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function CreateRequestDialog({
  isOpen,
  onClose,
  workspaceId,
  collectionId,
  folderId = null,
  targetName = null,
}) {
  const [name, setName] = useState('New Request');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://httpbin.org/get');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const createMutation = useCreateRequestMutation(workspaceId, collectionId);
  const expandFolder = useCollectionStore((s) => s.expandFolder);
  const expandCollection = useCollectionStore((s) => s.expandCollection);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!trimmedName) {
      setError('Request name is required');
      return;
    }
    if (!trimmedUrl) {
      setError('Request URL is required');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        method,
        url: trimmedUrl,
        folderId: folderId || undefined,
      });

      if (folderId) {
        expandFolder(folderId);
      } else if (collectionId) {
        expandCollection(collectionId);
      }

      setName('New Request');
      setMethod('GET');
      setUrl('https://httpbin.org/get');
      setError(null);
      onClose();

      // Navigate directly to the new request
      if (created?.id) {
        navigate(
          `/workspace/${workspaceId}/collections/${collectionId}/requests/${created.id}`
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    }
  };

  const handleClose = () => {
    setName('New Request');
    setMethod('GET');
    setUrl('https://httpbin.org/get');
    setError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={targetName ? `New Request in "${targetName}"` : 'New Request'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Request Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Get User Profile"
            maxLength={150}
            autoFocus
            required
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-1">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-2 py-2 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              URL <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              required
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#232732]">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending || !name.trim() || !url.trim()}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

