import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCreateRequestMutation } from '../../requests/hooks/useRequest';
import { useCollectionsQuery } from '../../workspace/hooks/useWorkspace';
import useCollectionStore from '../store/collectionStore';
import useRequestTabStore from '../../requests/store/requestTabStore';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export default function CreateRequestDialog({
  isOpen,
  onClose,
  workspaceId,
  collectionId,
  folderId = null,
  targetName = null,
  initialUrl = null,
  initialMethod = 'GET',
  initialName = null,
  onOpenCreateCollection = null,
}) {
  const [name, setName] = useState(initialName || 'New Request');
  const [method, setMethod] = useState(initialMethod || 'GET');
  const [url, setUrl] = useState(initialUrl || 'https://httpbin.org/get');
  const [error, setError] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(collectionId || '');
  const navigate = useNavigate();

  const { data: collections = [] } = useCollectionsQuery(workspaceId);
  const effectiveCollectionId =
    collectionId || selectedCollectionId || (collections.length > 0 ? collections[0].id : null);


  const createMutation = useCreateRequestMutation(workspaceId, effectiveCollectionId);
  const expandFolder = useCollectionStore((s) => s.expandFolder);
  const expandCollection = useCollectionStore((s) => s.expandCollection);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!workspaceId) {
      setError('A workspace is required to create a request');
      return;
    }
    if (!effectiveCollectionId) {
      setError('A collection is required to create a request. Please create a collection first.');
      return;
    }
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
      } else if (effectiveCollectionId) {
        expandCollection(effectiveCollectionId);
      }

      // Open tab in requestTabStore
      if (created?.id) {
        useRequestTabStore.getState().openTab({
          workspaceId,
          collectionId: effectiveCollectionId,
          requestId: created.id,
          title: trimmedName,
          method,
        });
      }

      setName(initialName || 'New Request');
      setMethod(initialMethod || 'GET');
      setUrl(initialUrl || 'https://httpbin.org/get');
      setError(null);
      onClose();

      // Navigate directly to the new request
      if (created?.id) {
        navigate(
          `/workspace/${workspaceId}/collections/${effectiveCollectionId}/requests/${created.id}`
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request');
    }
  };

  const handleClose = () => {
    setName(initialName || 'New Request');
    setMethod(initialMethod || 'GET');
    setUrl(initialUrl || 'https://httpbin.org/get');
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
          <div role="alert" className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* If workspace has no collections, show clear guidance */}
        {!collectionId && collections.length === 0 && (
          <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span>Collection Required</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              API requests belong to collections. Please create a collection first before creating requests in this workspace.
            </p>
            {onOpenCreateCollection && (
              <div>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-1"
                  onClick={() => {
                    handleClose();
                    onOpenCreateCollection();
                  }}
                >
                  Create Collection First
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Collection Selector if triggered from workspace/tab bar without explicit collection */}
        {!collectionId && collections.length > 0 && (
          <div>
            <label htmlFor="create-req-col" className="block text-xs font-medium text-slate-300 mb-1">
              Target Collection <span className="text-rose-400">*</span>
            </label>
            <select
              id="create-req-col"
              value={effectiveCollectionId || ''}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-sans cursor-pointer"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="create-req-name" className="block text-xs font-medium text-slate-300 mb-1">
            Request Name <span className="text-rose-400">*</span>
          </label>
          <input
            id="create-req-name"
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
            <label htmlFor="create-req-method" className="block text-xs font-medium text-slate-300 mb-1">
              Method
            </label>
            <select
              id="create-req-method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-2 py-2 text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label htmlFor="create-req-url" className="block text-xs font-medium text-slate-300 mb-1">
              URL <span className="text-rose-400">*</span>
            </label>
            <input
              id="create-req-url"
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
            disabled={createMutation.isPending || !name.trim() || !url.trim() || !effectiveCollectionId}
          >
            {createMutation.isPending
              ? 'Creating...'
              : !effectiveCollectionId
              ? 'Collection Required'
              : 'Create Request'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
