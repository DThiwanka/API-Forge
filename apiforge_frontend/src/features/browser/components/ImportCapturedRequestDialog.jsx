import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCollectionsQuery } from '../../workspace/hooks/useWorkspace';
import { useCreateRequestMutation } from '../../requests/hooks/useRequest';
import useRequestTabStore from '../../requests/store/requestTabStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { useResourceNavigation } from '../../../hooks/useResourceNavigation';
import { toast } from '../../../stores/toastStore';
import { findMatchingRequestInCollections } from '../utils/browserClientIntegration';
import {
  convertCapturedEventToRequestPreview,
} from '../utils/capturedRequestConverter';
import { getCapturedRequestImportPreview } from '../services/browserApi';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Code2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

function getMethodBadgeClass(method) {
  const m = (method || 'GET').toUpperCase();
  switch (m) {
    case 'GET':
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
    case 'POST':
      return 'bg-sky-950/60 text-sky-400 border-sky-800/60';
    case 'PUT':
      return 'bg-amber-950/60 text-amber-400 border-amber-800/60';
    case 'PATCH':
      return 'bg-purple-950/60 text-purple-400 border-purple-800/60';
    case 'DELETE':
      return 'bg-rose-950/60 text-rose-400 border-rose-800/60';
    default:
      return 'bg-slate-900 text-slate-300 border-slate-700';
  }
}

export default function ImportCapturedRequestDialog({
  isOpen,
  onClose,
  workspaceId,
  sessionId,
  networkEvent,
}) {
  const navigate = useNavigate();
  const { data: collections = [] } = useCollectionsQuery(workspaceId);

  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [customRequestName, setCustomRequestName] = useState('');
  const [openOnCanvas, setOpenOnCanvas] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch preview data from backend with local fallback via React Query
  const {
    data: previewData = null,
    isLoading: isLoadingPreview,
  } = useQuery({
    queryKey: ['browser-import-preview', workspaceId, sessionId, networkEvent?.id],
    queryFn: async () => {
      try {
        if (workspaceId && sessionId && networkEvent?.id) {
          const remote = await getCapturedRequestImportPreview(
            workspaceId,
            sessionId,
            networkEvent.id
          );
          if (remote) return remote;
        }
      } catch {
        // Fallback to local conversion
      }
      return convertCapturedEventToRequestPreview(networkEvent);
    },
    enabled: Boolean(isOpen && networkEvent),
    staleTime: 60000,
  });

  const requestName = customRequestName || previewData?.request?.name || 'Imported Request';

  // Active collection object and folders
  const effectiveCollectionId = selectedCollectionId || (collections[0]?.id ?? '');
  const activeCollection = useMemo(() => {
    return collections.find((c) => c.id === effectiveCollectionId) || collections[0] || null;
  }, [collections, effectiveCollectionId]);

  const availableFolders = useMemo(() => {
    return activeCollection?.folders || [];
  }, [activeCollection]);

  // Detect matching existing request
  const existingMatch = useMemo(() => {
    if (!networkEvent?.url) return null;
    return findMatchingRequestInCollections(collections, networkEvent.url);
  }, [networkEvent, collections]);

  const createMutation = useCreateRequestMutation(workspaceId, effectiveCollectionId);
  const { openRequest, openInCanvas: navOpenInCanvas } = useResourceNavigation(workspaceId);

  // Handle opening existing matching request
  const handleOpenExisting = useCallback(() => {
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
  }, [existingMatch, openRequest, workspaceId, navigate, onClose]);

  // Handle creating the API request draft
  const handleCreateDraft = async (e) => {
    e?.preventDefault();
    if (!previewData || !effectiveCollectionId) return;

    const trimmedName = requestName.trim() || 'Imported Request';
    const trimmedUrl = previewData.request.url.trim();

    if (!trimmedUrl) {
      setSubmitError('Request URL is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        name: trimmedName,
        method: previewData.request.method || 'GET',
        url: trimmedUrl,
        folderId: selectedFolderId || undefined,
        queryParams: previewData.request.queryParams?.length > 0 ? previewData.request.queryParams : undefined,
        headers: previewData.request.headers?.length > 0 ? previewData.request.headers : undefined,
        body: previewData.request.body?.mode !== 'none' ? previewData.request.body : undefined,
      };

      const created = await createMutation.mutateAsync(payload);

      // Register tab in requestTabStore with isDirty: true to require explicit save
      if (created?.id) {
        useRequestTabStore.getState().openTab({
          workspaceId,
          collectionId: effectiveCollectionId,
          requestId: created.id,
          title: trimmedName,
          method: previewData.request.method || 'GET',
          url: trimmedUrl,
          isDirty: true,
        });
      }

      // Security feedback toast
      if (previewData.security?.redactedHeaders?.length > 0) {
        toast.success(
          `Imported "${trimmedName}" as draft. Credentials (${previewData.security.redactedHeaders.join(', ')}) were omitted.`
        );
      } else {
        toast.success(`Imported "${trimmedName}" as draft`);
      }

      onClose();

      if (openOnCanvas && created?.id) {
        useCanvasStore.getState().addRequestNode(created, activeCollection?.name || 'Collection');
        navOpenInCanvas(created.id, {
          collectionId: effectiveCollectionId,
          request: created,
          collectionName: activeCollection?.name,
        });
        navigate(`/workspace/${workspaceId}/canvas`);
      } else if (created?.id) {
        navigate(
          `/workspace/${workspaceId}/collections/${effectiveCollectionId}/requests/${created.id}`
        );
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Failed to create request draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !networkEvent) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Import Captured Request to API Client"
      description="Review and sanitize captured browser traffic before creating an APIForge request draft."
      size="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs select-none">
        {/* Loading state */}
        {isLoadingPreview ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400">
            <Loader2 size={24} className="animate-spin text-sky-400 mb-2" />
            <p>Inspecting captured request and verifying security credentials...</p>
          </div>
        ) : previewData ? (
          <>
            {/* 1. MATCH PROMPT NOTICE (if matching request exists) */}
            {existingMatch && (
              <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sky-200">Matching Request Found in Workspace</p>
                    <p className="text-slate-300 text-[11px]">
                      &quot;{existingMatch.request?.name}&quot; in collection{' '}
                      <span className="font-medium text-slate-200">{existingMatch.collection?.name}</span>{' '}
                      matches this URL.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenExisting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                >
                  <ExternalLink size={12} />
                  <span>Open Existing</span>
                </button>
              </div>
            )}

            {/* 2. SECURITY REVIEW BANNER */}
            <div className="p-3 rounded-lg bg-[#151922] border border-[#2b3345] space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-200">Security & Credential Review</span>
              </div>

              <div className="space-y-1.5 pl-6 text-[11px] text-slate-300">
                {previewData.security?.redactedHeaders?.length > 0 ? (
                  <p className="text-amber-300/90 font-medium">
                    Removed automatically: {previewData.security.redactedHeaders.join(', ')}
                  </p>
                ) : (
                  <p className="text-emerald-300/90 flex items-center gap-1 font-medium">
                    <ShieldCheck size={13} className="text-emerald-400" />
                    No authorization credentials or cookies detected in request.
                  </p>
                )}

                {previewData.security?.excludedHeaders?.length > 0 && (
                  <p className="text-slate-400 text-[10px]">
                    Excluded transport headers: {previewData.security.excludedHeaders.join(', ')}
                  </p>
                )}

                <p className="text-slate-400 text-[10px] italic">
                  Browser cookies and authentication tokens are never saved. Configure authentication manually in the API Client if required.
                </p>
              </div>
            </div>

            {/* 3. CAPTURED REQUEST PREVIEW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  Request Configuration
                </span>
                <span className="px-1.5 py-0.2 rounded bg-[#1c212e] text-[10px] font-mono text-slate-400 border border-[#262c3d]">
                  Captured from Browser
                </span>
              </div>

              {/* Endpoint row */}
              <div className="flex items-center gap-2 p-2 rounded-md bg-[#12141c] border border-[#232732] font-mono text-[11px]">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0',
                    getMethodBadgeClass(previewData.request.method)
                  )}
                >
                  {previewData.request.method}
                </span>
                <span className="text-slate-200 truncate select-all flex-1" title={previewData.request.url}>
                  {previewData.request.url}
                </span>
              </div>

              {/* Query Parameters Preview */}
              {previewData.request.queryParams?.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Query Parameters ({previewData.request.queryParams.length})</span>
                    <span className="text-emerald-400/90">Captured</span>
                  </div>
                  <div className="bg-[#12141c] border border-[#232732] rounded-md divide-y divide-[#1e232f] font-mono text-[11px] max-h-28 overflow-y-auto">
                    {previewData.request.queryParams.map((param, idx) => (
                      <div key={idx} className="px-2 py-1 flex items-center justify-between">
                        <span className="text-sky-400">{param.key}</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe Headers Preview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Safe Headers ({previewData.request.headers?.length || 0})</span>
                  <span className="text-emerald-400/90">Sanitized</span>
                </div>
                {previewData.request.headers?.length > 0 ? (
                  <div className="bg-[#12141c] border border-[#232732] rounded-md divide-y divide-[#1e232f] font-mono text-[11px] max-h-28 overflow-y-auto">
                    {previewData.request.headers.map((h, idx) => (
                      <div key={idx} className="px-2 py-1 flex items-center justify-between">
                        <span className="text-sky-400">{h.key}</span>
                        <span className="text-slate-300 truncate max-w-[220px]">{h.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-1 text-slate-500 bg-[#12141c] border border-[#232732] rounded-md text-[11px]">
                    No additional headers
                  </div>
                )}
              </div>

              {/* Body Preview */}
              {previewData.request.body && previewData.request.body.mode !== 'none' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Request Body ({previewData.request.body.mode})</span>
                    <span className="text-sky-400/90">Captured</span>
                  </div>
                  <div className="p-2 bg-[#12141c] border border-[#232732] rounded-md font-mono text-[11px] max-h-32 overflow-y-auto text-slate-300 whitespace-pre-wrap">
                    {previewData.request.body.raw || JSON.stringify(previewData.request.body, null, 2)}
                  </div>
                </div>
              )}
            </div>

            {/* 4. DESTINATION & DRAFT CONFIGURATION */}
            <div className="space-y-3 pt-2 border-t border-[#232732]">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Destination in Workspace
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Collection selector */}
                <div className="space-y-1">
                  <label className="block text-slate-300 text-[11px] font-medium">Collection</label>
                  <select
                    value={effectiveCollectionId}
                    onChange={(e) => {
                      setSelectedCollectionId(e.target.value);
                      setSelectedFolderId('');
                    }}
                    className="w-full h-8 px-2.5 bg-[#12141c] border border-[#2b313e] rounded text-slate-200 text-xs focus:outline-hidden focus:border-sky-500 cursor-pointer"
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Folder selector */}
                <div className="space-y-1">
                  <label className="block text-slate-300 text-[11px] font-medium">Folder (Optional)</label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    disabled={availableFolders.length === 0}
                    className="w-full h-8 px-2.5 bg-[#12141c] border border-[#2b313e] rounded text-slate-200 text-xs focus:outline-hidden focus:border-sky-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Root Collection</option>
                    {availableFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Request Name input */}
              <div className="space-y-1">
                <label className="block text-slate-300 text-[11px] font-medium">Request Name</label>
                <input
                  type="text"
                  value={requestName}
                  onChange={(e) => setCustomRequestName(e.target.value)}
                  placeholder="e.g. GET /api/v1/users"
                  className="w-full h-8 px-2.5 bg-[#12141c] border border-[#2b313e] rounded text-slate-200 text-xs focus:outline-hidden focus:border-sky-500"
                />
              </div>

              {/* Open on Canvas toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px] pt-1">
                <input
                  type="checkbox"
                  checked={openOnCanvas}
                  onChange={(e) => setOpenOnCanvas(e.target.checked)}
                  className="rounded border-[#2b313e] text-sky-500 focus:ring-0 focus:ring-offset-0 bg-[#12141c]"
                />
                <span>Open directly on Spatial API Canvas after import</span>
              </label>
            </div>

            {/* Submit error banner */}
            {submitError && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Dialog Footer Actions */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#232732]">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateDraft}
            disabled={isSubmitting || !previewData || !effectiveCollectionId}
            className="flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Creating Draft...</span>
              </>
            ) : (
              <>
                <Code2 size={13} />
                <span>Create API Request</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
