import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { previewCurl, importCurl } from '../services/importExportApi';
import { useCollectionsQuery, useFoldersQuery } from '../../collections/hooks/useCollections';
import useCollectionStore from '../../collections/store/collectionStore';
import CurlPreview from './CurlPreview';
import Button from '../../../components/ui/Button';
import { Loader2, AlertCircle, Play, RotateCcw, ArrowDownCircle, Folder } from 'lucide-react';

function flattenFolderTree(folders = [], depth = 0) {
  const result = [];
  for (const f of folders) {
    result.push({
      id: f.id,
      name: `${'— '.repeat(depth)}${f.name}`,
    });
    if (f.children && f.children.length > 0) {
      result.push(...flattenFolderTree(f.children, depth + 1));
    }
  }
  return result;
}

const SAMPLE_CURL = `curl -X POST https://api.example.com/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my-secret-token" \\
  -d '{"name": "Alice", "role": "Developer"}'`;

export default function CurlImport({
  workspaceId,
  defaultCollectionId = '',
  defaultFolderId = '',
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [curlCommand, setCurlCommand] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [requestName, setRequestName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState(defaultCollectionId);
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId);

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load collections in this workspace
  const { data: collections = [], isLoading: isLoadingCollections } =
    useCollectionsQuery(workspaceId);

  // Derive effective collection ID declaratively
  const effectiveCollectionId =
    selectedCollectionId || (collections.length > 0 ? collections[0].id : '');

  // Load folders for selected collection
  const { data: folders = [] } = useFoldersQuery(workspaceId, effectiveCollectionId);
  const flatFolders = useMemo(() => flattenFolderTree(folders), [folders]);

  const expandCollection = useCollectionStore((s) => s.expandCollection);
  const expandFolder = useCollectionStore((s) => s.expandFolder);

  // Reset folder selection when collection changes unless defaultFolderId matches
  const handleCollectionChange = (newColId) => {
    setSelectedCollectionId(newColId);
    setSelectedFolderId('');
  };

  // Preview cURL Command
  const handlePreview = async () => {
    const trimmed = curlCommand.trim();
    if (!trimmed) return;

    setIsPreviewLoading(true);
    setError(null);

    try {
      const parsed = await previewCurl(workspaceId, trimmed);
      setPreviewData(parsed);
      setRequestName(parsed.name || 'Imported Request');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Failed to parse cURL command';
      setError(msg);
      setPreviewData(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Clear all state
  const handleClear = () => {
    setCurlCommand('');
    setPreviewData(null);
    setRequestName('');
    setError(null);
  };

  // Save / Import Request
  const handleImport = async (e) => {
    e.preventDefault();
    if (!previewData || !effectiveCollectionId) return;

    setIsImportLoading(true);
    setError(null);

    try {
      const created = await importCurl(workspaceId, {
        curl: curlCommand.trim(),
        collectionId: effectiveCollectionId,
        folderId: selectedFolderId || null,
        name: requestName.trim() || previewData.name,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['requests', workspaceId, effectiveCollectionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['collections', workspaceId],
      });

      // Expand collection and folder in tree
      expandCollection(effectiveCollectionId);
      if (selectedFolderId) {
        expandFolder(selectedFolderId);
      }

      onSuccess?.(created);
      onClose?.();

      // Navigate to the newly imported request
      if (created?.id) {
        navigate(
          `/workspace/${workspaceId}/collections/${effectiveCollectionId}/requests/${created.id}`
        );
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Failed to import request';
      setError(msg);
    } finally {
      setIsImportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 break-words">{error}</div>
        </div>
      )}

      {/* cURL Input Field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="curl-command-input"
            className="block text-xs font-semibold text-slate-200"
          >
            cURL Command <span className="text-rose-400">*</span>
          </label>
          {curlCommand && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={11} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <textarea
          id="curl-command-input"
          value={curlCommand}
          onChange={(e) => {
            setCurlCommand(e.target.value);
            if (error) setError(null);
          }}
          placeholder={SAMPLE_CURL}
          rows={5}
          className="w-full bg-[#0d0f14] border border-[#2b313e] rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors resize-y leading-relaxed"
          autoFocus
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Paste any standard cURL command with flags like -X, -H, -d, or -u. Backslash line continuations (\) are fully supported.
        </p>
      </div>

      {/* Preview Trigger Button */}
      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={handlePreview}
          disabled={!curlCommand.trim() || isPreviewLoading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5"
        >
          {isPreviewLoading ? (
            <>
              <Loader2 size={13} className="animate-spin text-sky-400" />
              <span>Parsing cURL...</span>
            </>
          ) : (
            <>
              <Play size={12} className="text-sky-400 fill-sky-400" />
              <span>Preview Parsed Request</span>
            </>
          )}
        </Button>

        {previewData && (
          <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            ✓ Successfully parsed
          </span>
        )}
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="space-y-4 pt-2 border-t border-[#232732] animate-in fade-in duration-200">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 mb-2">
              <ArrowDownCircle size={13} className="text-sky-400" />
              <span>Parsed Request Preview</span>
            </div>
            <CurlPreview parsedRequest={previewData} />
          </div>

          {/* Destination Form: Collection, Folder, Name */}
          <form onSubmit={handleImport} className="space-y-3 pt-2">
            {/* Request Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Request Name
              </label>
              <input
                type="text"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="e.g. My API Request"
                maxLength={150}
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-sans"
              />
            </div>

            {/* Target Collection & Folder Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Collection Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Collection <span className="text-rose-400">*</span>
                </label>
                {isLoadingCollections ? (
                  <div className="text-xs text-slate-500 py-1.5">Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className="text-xs text-amber-400 py-1">
                    No collections in workspace. Please create a collection first.
                  </div>
                ) : (
                  <select
                    value={effectiveCollectionId}
                    onChange={(e) => handleCollectionChange(e.target.value)}
                    required
                    className="w-full bg-[#181b22] border border-[#2b313e] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Folder Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Folder (Optional)
                </label>
                <div className="relative">
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    disabled={!effectiveCollectionId || flatFolders.length === 0}
                    className="w-full bg-[#181b22] border border-[#2b313e] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No folder (Collection Root)</option>
                    {flatFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232732]">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isImportLoading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isImportLoading ||
                  !effectiveCollectionId ||
                  collections.length === 0 ||
                  !previewData
                }
                className="text-xs inline-flex items-center gap-1.5"
              >
                {isImportLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-white" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Folder size={12} />
                    <span>Import Request</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
