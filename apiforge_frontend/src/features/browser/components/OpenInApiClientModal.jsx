import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCollectionsQuery } from '../../workspace/hooks/useWorkspace';
import { useCreateRequestMutation } from '../../requests/hooks/useRequest';
import useRequestTabStore from '../../requests/store/requestTabStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { useResourceNavigation } from '../../../hooks/useResourceNavigation';
import { toast } from '../../../stores/toastStore';
import {
  generateRequestNameFromUrl,
  findMatchingRequestInCollections,
  syncUrlToQueryParams,
} from '../utils/browserClientIntegration';
import {
  CheckCircle2,
  ExternalLink,
  Plus,
  Sparkles,
} from 'lucide-react';

function OpenInApiClientContent({
  onClose,
  workspaceId,
  url = '',
  pageTitle = '',
}) {
  const navigate = useNavigate();
  const { data: collections = [] } = useCollectionsQuery(workspaceId);

  // Detect matching existing request
  const existingMatch = useMemo(() => {
    if (!url) return null;
    return findMatchingRequestInCollections(collections, url);
  }, [url, collections]);

  const [viewMode, setViewMode] = useState(() => (existingMatch ? 'match_prompt' : 'create_form'));
  const [selectedCollectionId, setSelectedCollectionId] = useState(() => collections[0]?.id || '');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [name, setName] = useState(() => {
    return pageTitle && pageTitle.trim() && pageTitle.trim() !== 'New Tab'
      ? `GET ${pageTitle.trim().slice(0, 50)}`
      : generateRequestNameFromUrl(url);
  });
  const [openOnCanvas, setOpenOnCanvas] = useState(false);
  const [error, setError] = useState(null);

  // Selected collection object and its folders
  const activeCollection = useMemo(() => {
    return collections.find((c) => c.id === selectedCollectionId) || collections[0] || null;
  }, [collections, selectedCollectionId]);

  const availableFolders = useMemo(() => {
    return activeCollection?.folders || [];
  }, [activeCollection]);

  // Query params parsed from URL
  const queryParams = useMemo(() => {
    if (!url || !url.includes('?')) return [];
    return syncUrlToQueryParams(url).filter((p) => p.key || p.value);
  }, [url]);

  const effectiveCollectionId = selectedCollectionId || (collections[0]?.id ?? null);
  const createMutation = useCreateRequestMutation(workspaceId, effectiveCollectionId);
  const { openRequest, openInCanvas: navOpenInCanvas } = useResourceNavigation(workspaceId);

  // Handle opening existing request
  const handleOpenExisting = () => {
    if (!existingMatch?.request || !existingMatch?.collection) return;
    const { request: matchReq, collection: matchCol } = existingMatch;

    openRequest(matchReq.id, {
      collectionId: matchCol.id,
      folderId: matchReq.folderId,
      title: matchReq.name,
      method: matchReq.method || 'GET',
      url: matchReq.url,
    });

    toast.success(`Opened existing request "${matchReq.name}"`);
    onClose();
    navigate(`/workspace/${workspaceId}/collections/${matchCol.id}/requests/${matchReq.id}`);
  };

  // Handle submitting new request creation
  const handleCreateRequest = async (e) => {
    e?.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();

    if (!effectiveCollectionId) {
      setError('Please create or select a collection first.');
      return;
    }
    if (!trimmedName) {
      setError('Request name is required.');
      return;
    }
    if (!trimmedUrl) {
      setError('Request URL is required.');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        name: trimmedName,
        method: 'GET',
        url: trimmedUrl,
        folderId: selectedFolderId || undefined,
        queryParams: queryParams.length > 0 ? queryParams : undefined,
      });

      // Register tab in canonical requestTabStore
      if (created?.id) {
        useRequestTabStore.getState().openTab({
          workspaceId,
          collectionId: effectiveCollectionId,
          requestId: created.id,
          title: trimmedName,
          method: 'GET',
          url: trimmedUrl,
        });
      }

      toast.success(`Created request "${trimmedName}"`);
      onClose();

      if (openOnCanvas && created?.id) {
        // Add node to Canvas and navigate to Canvas
        useCanvasStore.getState().addRequestNode(created, activeCollection?.name || 'Collection');
        navOpenInCanvas(created.id, {
          collectionId: effectiveCollectionId,
          request: created,
          collectionName: activeCollection?.name,
        });
        navigate(`/workspace/${workspaceId}/canvas`);
      } else if (created?.id) {
        // Navigate to Request Workspace
        navigate(
          `/workspace/${workspaceId}/collections/${effectiveCollectionId}/requests/${created.id}`
        );
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create request');
    }
  };

  return (
    <>
      {/* 1. MATCH PROMPT SCREEN */}
      {viewMode === 'match_prompt' && existingMatch && (
        <div className="space-y-4 text-xs select-none">
          <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-start gap-3">
            <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sky-200">
                Matching Request Found
              </p>
              <p className="text-slate-300">
                An existing request in your workspace matches this URL:
              </p>
              <div className="mt-2 p-2 rounded bg-[#0e1117] border border-[#232732] font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span>{existingMatch.request.method || 'GET'}</span>
                  <span className="text-slate-200 font-sans font-medium">
                    {existingMatch.request.name}
                  </span>
                </div>
                <div className="text-slate-400 truncate text-[10px] mt-0.5">
                  Collection: {existingMatch.collection.name}
                </div>
                <div className="text-slate-500 truncate text-[10px]">
                  {existingMatch.request.url}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleOpenExisting}
              className="w-full flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Open Existing Request</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setViewMode('create_form')}
              className="w-full flex items-center justify-center gap-1.5"
            >
              <Plus size={13} />
              <span>Create New Request Instead</span>
            </Button>
          </div>
        </div>
      )}

      {/* 2. CREATE REQUEST FORM */}
      {(viewMode === 'create_form' || !existingMatch) && (
        <form onSubmit={handleCreateRequest} className="space-y-3 text-xs select-none">
          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* URL & Method Summary */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Source URL
            </label>
            <div className="flex items-center gap-2 p-2 rounded bg-[#10121a] border border-[#232732] font-mono text-[11px]">
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold">
                GET
              </span>
              <span className="text-slate-300 truncate" title={url}>
                {url}
              </span>
            </div>
          </div>

          {/* Request Name */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Request Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GET api.example.com/users"
              maxLength={150}
              autoFocus
              required
              className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>

          {/* Collection Selector */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Destination Collection <span className="text-rose-400">*</span>
            </label>
            {collections.length === 0 ? (
              <p className="text-amber-400 text-xs italic">
                No collections in this workspace. Please create a collection first.
              </p>
            ) : (
              <div className="relative">
                <select
                  value={effectiveCollectionId || ''}
                  onChange={(e) => {
                    setSelectedCollectionId(e.target.value);
                    setSelectedFolderId('');
                  }}
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
          </div>

          {/* Folder Selector (Optional) */}
          {availableFolders.length > 0 && (
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Folder <span className="text-slate-500 text-[10px]">(Optional)</span>
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-sans cursor-pointer"
              >
                <option value="">Root of Collection</option>
                {availableFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Query Parameters Preview */}
          {queryParams.length > 0 && (
            <div>
              <label className="block font-medium text-slate-400 mb-1">
                Preserved Query Parameters ({queryParams.length})
              </label>
              <div className="p-2 rounded bg-[#10121a] border border-[#232732] max-h-24 overflow-y-auto space-y-1 font-mono text-[10px]">
                {queryParams.map((qp, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-300">
                    <span className="text-sky-400 font-medium">{qp.key}</span>
                    <span className="text-slate-400 truncate max-w-[150px]">
                      {qp.value || '""'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Also Open in Canvas Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={openOnCanvas}
                onChange={(e) => setOpenOnCanvas(e.target.checked)}
                className="rounded border-[#2b313e] bg-[#181b22] text-sky-500 focus:ring-0 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-sky-400" />
                <span>Also add to Visual Canvas</span>
              </span>
            </label>
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#232732]">
            {existingMatch && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setViewMode('match_prompt')}
                className="mr-auto text-xs"
              >
                Back to Match
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending || !name.trim() || !url.trim() || !effectiveCollectionId}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

export default function OpenInApiClientModal({
  isOpen,
  onClose,
  workspaceId,
  url = '',
  pageTitle = '',
}) {
  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Open in API Client"
      maxWidth="max-w-md"
    >
      <OpenInApiClientContent
        key={`${url}-${workspaceId}`}
        onClose={onClose}
        workspaceId={workspaceId}
        url={url}
        pageTitle={pageTitle}
      />
    </Dialog>
  );
}

