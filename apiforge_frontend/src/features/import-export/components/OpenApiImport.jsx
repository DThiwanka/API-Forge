import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { previewOpenApi, importOpenApi } from '../services/importExportApi';
import { useCollectionsQuery, useFoldersQuery } from '../../collections/hooks/useCollections';
import useCollectionStore from '../../collections/store/collectionStore';
import OpenApiPreview from './OpenApiPreview';
import Button from '../../../components/ui/Button';
import {
  Loader2,
  AlertCircle,
  Play,
  RotateCcw,
  Upload,
  FileCode,
  CheckCircle2,
  FolderPlus,
  FolderTree,
  Folder,
  X,
} from 'lucide-react';

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

const SAMPLE_OPENAPI = `openapi: 3.0.3
info:
  title: Petstore API
  version: 1.0.0
  description: Sample API definition for demonstration
servers:
  - url: https://petstore.example.com/v1
paths:
  /pets:
    get:
      summary: List all pets
      tags: [Pets]
    post:
      summary: Create a pet
      tags: [Pets]
  /pets/{petId}:
    get:
      summary: Get pet by ID
      tags: [Pets]
  /store/inventory:
    get:
      summary: Returns pet inventories
      tags: [Store]`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function OpenApiImport({
  workspaceId,
  defaultCollectionId = '',
  defaultFolderId = '',
  onClose,
  onSuccess,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Input mode: 'paste' | 'upload'
  const [inputMode, setInputMode] = useState('paste');
  const [rawDocument, setRawDocument] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Parsed Preview Data
  const [previewData, setPreviewData] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  // Destination Configuration: 'new' | 'existing'
  const [destinationMode, setDestinationMode] = useState(
    defaultCollectionId ? 'existing' : 'new'
  );
  const [customCollectionName, setCustomCollectionName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState(defaultCollectionId);
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId);

  // Loading & Error states
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [error, setError] = useState(null);

  // Collections Query
  const { data: collections = [], isLoading: isLoadingCollections } =
    useCollectionsQuery(workspaceId);

  // Effective collection ID for folder lookup
  const effectiveCollectionId =
    destinationMode === 'existing'
      ? selectedCollectionId || (collections.length > 0 ? collections[0].id : '')
      : '';

  // Folders Query for existing collection
  const { data: folders = [] } = useFoldersQuery(workspaceId, effectiveCollectionId);
  const flatFolders = useMemo(() => flattenFolderTree(folders), [folders]);

  const expandCollection = useCollectionStore((s) => s.expandCollection);
  const expandFolder = useCollectionStore((s) => s.expandFolder);

  // Handle File selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum allowed limit of 5 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      return;
    }

    const validExtensions = ['.json', '.yaml', '.yml'];
    const fileNameLower = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileNameLower.endsWith(ext));

    if (!isValid) {
      setError('Please upload a valid JSON or YAML file (.json, .yaml, .yml)');
      return;
    }

    setError(null);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawDocument(event.target.result);
    };
    reader.onerror = () => {
      setError('Failed to read uploaded file');
    };
    reader.readAsText(file);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
    setRawDocument('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Preview Specification
  const handlePreview = async () => {
    const trimmed = rawDocument.trim();
    if (!trimmed) {
      setError('Please paste an OpenAPI specification or upload a file');
      return;
    }

    setIsPreviewLoading(true);
    setError(null);

    try {
      const parsed = await previewOpenApi(workspaceId, trimmed);
      setPreviewData(parsed);

      // Default select all operations
      const allKeys = new Set(parsed.requests.map((r) => `${r.method}:${r.url}`));
      setSelectedKeys(allKeys);

      // Pre-fill collection name from metadata
      setCustomCollectionName(
        parsed.collection?.name || parsed.metadata?.title || 'Imported API'
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Failed to parse OpenAPI document';
      setError(msg);
      setPreviewData(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Reset to change specification
  const handleReset = () => {
    setPreviewData(null);
    setSelectedKeys(new Set());
    setError(null);
  };

  // Selection toggles
  const handleToggleOperation = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleTag = (tag, isSelected) => {
    if (!previewData) return;
    const tagRequests = previewData.requests.filter(
      (r) => (r.folderName || 'General (Untagged)') === tag
    );
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      tagRequests.forEach((r) => {
        const k = `${r.method}:${r.url}`;
        if (isSelected) next.add(k);
        else next.delete(k);
      });
      return next;
    });
  };

  const handleToggleAll = (isSelected) => {
    if (!previewData) return;
    if (isSelected) {
      setSelectedKeys(new Set(previewData.requests.map((r) => `${r.method}:${r.url}`)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  // Execute Import
  const handleImport = async (e) => {
    e.preventDefault();
    if (!previewData || selectedKeys.size === 0) return;

    if (destinationMode === 'new' && !customCollectionName.trim()) {
      setError('Please provide a collection name');
      return;
    }

    if (destinationMode === 'existing' && !effectiveCollectionId) {
      setError('Please select an existing target collection');
      return;
    }

    setIsImportLoading(true);
    setError(null);

    try {
      const payload = {
        document: rawDocument.trim(),
        selectedOperations: Array.from(selectedKeys),
      };

      if (destinationMode === 'new') {
        payload.collectionName = customCollectionName.trim();
      } else {
        payload.collectionId = effectiveCollectionId;
        if (selectedFolderId) {
          payload.folderId = selectedFolderId;
        }
      }

      const result = await importOpenApi(workspaceId, payload);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] });

      const targetColId = result?.collection?.id || effectiveCollectionId;
      if (targetColId) {
        expandCollection(targetColId);
      }
      if (selectedFolderId) {
        expandFolder(selectedFolderId);
      }

      onSuccess?.(result);
      onClose?.();

      if (targetColId) {
        navigate(`/workspace/${workspaceId}/collections/${targetColId}`);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Failed to import OpenAPI specification';
      setError(msg);
    } finally {
      setIsImportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 break-words">{error}</div>
        </div>
      )}

      {/* Mode 1: Document Input Phase (if not yet previewed) */}
      {!previewData && (
        <div className="space-y-3">
          {/* Subheader tabs: Paste vs Upload */}
          <div className="flex items-center justify-between border-b border-[#232732] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputMode('paste');
                  setError(null);
                }}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-[#1e2330] text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode size={13} />
                <span>Paste JSON / YAML</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputMode('upload');
                  setError(null);
                }}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1.5 ${
                  inputMode === 'upload'
                    ? 'bg-[#1e2330] text-sky-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload size={13} />
                <span>Upload File</span>
              </button>
            </div>

            {rawDocument && (
              <button
                type="button"
                onClick={() => {
                  setRawDocument('');
                  setUploadedFile(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={11} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Paste Document Textarea */}
          {inputMode === 'paste' && (
            <div>
              <textarea
                value={rawDocument}
                onChange={(e) => {
                  setRawDocument(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={SAMPLE_OPENAPI}
                rows={10}
                className="w-full bg-[#0d0f14] border border-[#2b313e] rounded-md px-3 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors resize-y leading-relaxed"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Supports OpenAPI 3.0.x and 3.1.x specifications in JSON or YAML.</span>
                <span>Max 5 MB</span>
              </p>
            </div>
          )}

          {/* File Upload Zone */}
          {inputMode === 'upload' && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#2b313e] hover:border-sky-500/70 rounded-lg p-8 text-center cursor-pointer transition-colors bg-[#0d0f14]/50 group"
                >
                  <Upload
                    size={28}
                    className="mx-auto text-slate-500 group-hover:text-sky-400 mb-2 transition-colors"
                  />
                  <p className="text-xs font-medium text-slate-200">
                    Click to browse or drop an OpenAPI file here
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accepts .json, .yaml, or .yml (up to 5 MB)
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#0d0f14] border border-[#2b313e] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCode size={20} className="text-sky-400" />
                    <div>
                      <div className="text-xs font-medium text-slate-100">
                        {uploadedFile.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="p-1 hover:bg-[#1f2430] rounded text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action to preview */}
          <div className="flex items-center justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={handlePreview}
              disabled={!rawDocument.trim() || isPreviewLoading}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2"
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin text-white" />
                  <span>Parsing & Dereferencing...</span>
                </>
              ) : (
                <>
                  <Play size={13} className="fill-current" />
                  <span>Preview Specification</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mode 2: Preview & Destination Selection Phase */}
      {previewData && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Reset bar */}
          <div className="flex items-center justify-between pb-2 border-b border-[#232732]">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 size={14} />
              <span>Specification successfully parsed</span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={11} />
              <span>Change Specification</span>
            </button>
          </div>

          {/* OpenAPI Preview & Selective Operations Component */}
          <OpenApiPreview
            previewData={previewData}
            selectedKeys={selectedKeys}
            onToggleOperation={handleToggleOperation}
            onToggleTag={handleToggleTag}
            onToggleAll={handleToggleAll}
          />

          {/* Destination Configuration Form */}
          <form onSubmit={handleImport} className="space-y-3 pt-2 border-t border-[#232732]">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <FolderTree size={14} className="text-sky-400" />
              <span>Destination Settings</span>
            </div>

            {/* Destination Mode Choice: New vs Existing */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDestinationMode('new')}
                className={`px-3 py-2 rounded-lg border text-left transition-all ${
                  destinationMode === 'new'
                    ? 'border-sky-500 bg-sky-950/20 text-white'
                    : 'border-[#2b313e] bg-[#0d0f14] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <FolderPlus size={13} className={destinationMode === 'new' ? 'text-sky-400' : ''} />
                  <span>Create New Collection</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Isolate requests in a fresh collection
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDestinationMode('existing')}
                className={`px-3 py-2 rounded-lg border text-left transition-all ${
                  destinationMode === 'existing'
                    ? 'border-sky-500 bg-sky-950/20 text-white'
                    : 'border-[#2b313e] bg-[#0d0f14] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Folder size={13} className={destinationMode === 'existing' ? 'text-sky-400' : ''} />
                  <span>Add to Existing Collection</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Merge into existing workspace collection
                </div>
              </button>
            </div>

            {/* If New Collection: Collection Name input */}
            {destinationMode === 'new' && (
              <div>
                <label
                  htmlFor="openapi-collection-name"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Collection Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id="openapi-collection-name"
                  type="text"
                  value={customCollectionName}
                  onChange={(e) => setCustomCollectionName(e.target.value)}
                  placeholder="e.g. Petstore API"
                  maxLength={150}
                  required
                  className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {/* If Existing Collection: Pick collection and optional folder */}
            {destinationMode === 'existing' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Collection select */}
                <div>
                  <label
                    htmlFor="openapi-target-collection"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Target Collection <span className="text-rose-400">*</span>
                  </label>
                  {isLoadingCollections ? (
                    <div className="text-xs text-slate-500 py-1.5">Loading collections...</div>
                  ) : collections.length === 0 ? (
                    <div className="text-xs text-amber-400 py-1">
                      No collections found. Please use &quot;Create New Collection&quot;.
                    </div>
                  ) : (
                    <select
                      id="openapi-target-collection"
                      value={effectiveCollectionId}
                      onChange={(e) => {
                        setSelectedCollectionId(e.target.value);
                        setSelectedFolderId('');
                      }}
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

                {/* Folder select */}
                <div>
                  <label
                    htmlFor="openapi-target-folder"
                    className="block text-xs font-medium text-slate-300 mb-1"
                  >
                    Target Folder
                  </label>
                  <select
                    id="openapi-target-folder"
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    disabled={!effectiveCollectionId}
                    className="w-full bg-[#181b22] border border-[#2b313e] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    <option value="">Create folders from tags (recommended)</option>
                    {flatFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#232732]">
              <div className="text-xs text-slate-400">
                <span className="text-sky-400 font-semibold font-mono">{selectedKeys.size}</span> of{' '}
                {previewData.requests.length} operations will be imported
              </div>

              <div className="flex items-center gap-2">
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
                    selectedKeys.size === 0 ||
                    (destinationMode === 'new' && !customCollectionName.trim()) ||
                    (destinationMode === 'existing' && !effectiveCollectionId)
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
                      <FolderPlus size={13} />
                      <span>Import {selectedKeys.size} Requests</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

