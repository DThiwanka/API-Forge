import { useState } from 'react';
import { useCollectionsQuery } from '../../collections/hooks/useCollections';
import { exportOpenApi } from '../services/importExportApi';
import Button from '../../../components/ui/Button';
import {
  Download,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  FileCode2,
  FolderTree,
} from 'lucide-react';

export default function OpenApiExport({
  workspaceId,
  defaultCollectionId = '',
  initialFormat = 'json',
  onClose,
}) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(defaultCollectionId);
  const [format, setFormat] = useState(initialFormat);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedResult, setExportedResult] = useState(null);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  // Load collections for active workspace
  const { data: collections = [], isLoading: isLoadingCollections } =
    useCollectionsQuery(workspaceId);

  // Derive effective collection ID declaratively
  const effectiveCollectionId =
    selectedCollectionId || (collections.length > 0 ? collections[0].id : '');

  const selectedCollection = collections.find((c) => c.id === effectiveCollectionId);

  // Trigger download helper
  const triggerDownload = (content, filename, currentFormat) => {
    try {
      const mimeType =
        currentFormat === 'yaml'
          ? 'application/yaml;charset=utf-8'
          : 'application/json;charset=utf-8';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `collection.openapi.${currentFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Browser blocked download. Please use the Copy button instead.');
    }
  };

  // Export specification handler
  const handleExport = async (e) => {
    e?.preventDefault();
    if (!workspaceId || !effectiveCollectionId) {
      setError('Please select a collection to export');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const result = await exportOpenApi(workspaceId, effectiveCollectionId, format);
      setExportedResult(result);

      // Trigger automatic file download
      triggerDownload(result.content, result.filename, result.format);
    } catch (err) {
      let msg = 'Failed to export collection as OpenAPI specification';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          try {
            const parsed = JSON.parse(err.response.data);
            msg = parsed.message || parsed.errors?.[0]?.message || msg;
          } catch {
            msg = err.response.data;
          }
        } else if (typeof err.response.data === 'object') {
          msg = err.response.data.message || err.response.data.errors?.[0]?.message || msg;
        }
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      setExportedResult(null);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to clipboard handler
  const handleCopy = async () => {
    if (!exportedResult?.content) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(exportedResult.content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = exportedResult.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch {
      setError('Unable to copy. Please try again or select the text manually.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-400 -mt-2">
        Export a collection of requests into a standard OpenAPI 3.0.3 specification in JSON or YAML format.
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
          <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 break-words">{error}</div>
        </div>
      )}

      {/* Options Form: Collection & Format Selection */}
      <form onSubmit={handleExport} className="space-y-4">
        {/* Collection Selector */}
        <div>
          <label
            htmlFor="openapi-export-collection-select"
            className="block text-xs font-semibold text-slate-200 mb-1.5"
          >
            Collection <span className="text-rose-400">*</span>
          </label>
          {isLoadingCollections ? (
            <div className="text-xs text-slate-500 py-1.5 flex items-center gap-1.5 font-mono">
              <Loader2 size={12} className="animate-spin text-sky-400" />
              <span>Loading collections...</span>
            </div>
          ) : collections.length === 0 ? (
            <div className="p-3 rounded-md bg-[#0d0f14] border border-[#2b313e] text-xs text-amber-400">
              No collections found in this workspace. Please create a collection with requests first.
            </div>
          ) : (
            <div className="relative">
              <select
                id="openapi-export-collection-select"
                value={effectiveCollectionId}
                onChange={(e) => {
                  setSelectedCollectionId(e.target.value);
                  setExportedResult(null);
                  setError(null);
                }}
                disabled={isExporting}
                className="w-full bg-[#0d0f14] border border-[#2b313e] rounded-md px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 transition-colors"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedCollection?.description && (
            <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
              {selectedCollection.description}
            </p>
          )}
        </div>

        {/* Format Selection (JSON vs YAML) */}
        <div>
          <span className="block text-xs font-semibold text-slate-200 mb-1.5">
            Export Format <span className="text-rose-400">*</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setFormat('json');
                if (exportedResult && exportedResult.format !== 'json') {
                  setExportedResult(null);
                }
              }}
              disabled={isExporting}
              className={`px-3 py-2 rounded-lg border text-left transition-all ${
                format === 'json'
                  ? 'border-sky-500 bg-sky-950/20 text-white'
                  : 'border-[#2b313e] bg-[#0d0f14] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <FileCode2 size={13} className={format === 'json' ? 'text-sky-400' : ''} />
                <span>JSON</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Standard application/json document
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormat('yaml');
                if (exportedResult && exportedResult.format !== 'yaml') {
                  setExportedResult(null);
                }
              }}
              disabled={isExporting}
              className={`px-3 py-2 rounded-lg border text-left transition-all ${
                format === 'yaml'
                  ? 'border-sky-500 bg-sky-950/20 text-white'
                  : 'border-[#2b313e] bg-[#0d0f14] text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <FileCode2 size={13} className={format === 'yaml' ? 'text-sky-400' : ''} />
                <span>YAML</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Clean, human-readable YAML document
              </div>
            </button>
          </div>
        </div>

        {/* Export Submit Button (if not yet exported or needs regeneration) */}
        {!exportedResult && (
          <div className="flex items-center justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              disabled={isExporting || !effectiveCollectionId || collections.length === 0}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2"
            >
              {isExporting ? (
                <>
                  <Loader2 size={13} className="animate-spin text-white" />
                  <span>Exporting OpenAPI...</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Export & Download {format.toUpperCase()}</span>
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Exported Result Preview Box */}
      {exportedResult && (
        <div className="space-y-3 pt-2 border-t border-[#232732] animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree size={14} className="text-sky-400" />
              <span className="text-xs font-semibold text-slate-200 font-mono">
                {exportedResult.filename}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1f2430] text-sky-400 border border-sky-800/40 uppercase">
                {exportedResult.format}
              </span>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              {exportedResult.content.length.toLocaleString()} characters
            </span>
          </div>

          <div className="rounded-md border border-[#232732] bg-[#0d0f14] overflow-hidden">
            <pre className="p-3 font-mono text-xs text-slate-200 overflow-x-auto max-h-64 whitespace-pre leading-relaxed select-all selection:bg-sky-900 selection:text-white">
              {exportedResult.content}
            </pre>
          </div>

          {/* Footer Actions: Download Again, Copy to Clipboard, Close */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setExportedResult(null);
              }}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Change Settings
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  triggerDownload(
                    exportedResult.content,
                    exportedResult.filename,
                    exportedResult.format
                  )
                }
                className="text-xs inline-flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Download Again</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleCopy}
                className="text-xs inline-flex items-center gap-1.5"
              >
                {isCopied ? (
                  <>
                    <Check size={13} className="text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Specification</span>
                  </>
                )}
              </Button>

              {onClose && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="text-xs"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

