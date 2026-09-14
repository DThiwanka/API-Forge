import { useState, useRef, useEffect } from 'react';
import {
  Edit2,
  Check,
  X,
  Terminal,
  FolderGit2,
  MoreHorizontal,
  Copy,
  CopyPlus,
  Workflow,
  Trash2,
} from 'lucide-react';
import RequestSaveButton from './RequestSaveButton';
import ExportDialog from '../../import-export/components/ExportDialog';
import { useToastStore } from '../../../stores/toastStore';
import { useResourceNavigation } from '../../../hooks/useResourceNavigation';
import { cn } from '../../../utils/cn';

export default function RequestHeader({
  name,
  onNameChange,
  isDirty = false,
  isSaving = false,
  isError = false,
  onSave,
  workspaceId,
  collectionId,
  collectionName,
  folderId,
  folderName,
  requestId,
  url = '',
  method = 'GET',
  onDuplicate,
  onDelete,
  className,
}) {
  const { revealInCollection, openInCanvas } = useResourceNavigation(workspaceId);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name || '');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown menu on outside click or Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleStartEdit = () => {
    setTempName(name || '');
    setIsEditing(true);
  };

  const handleSaveName = () => {
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTempName(name || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleCopyUrl = async () => {
    setIsMenuOpen(false);
    if (!url || !url.trim()) {
      useToastStore.getState().toast.info('No URL configured on this request');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      useToastStore.getState().toast.success('Request URL copied to clipboard');
    } catch {
      useToastStore.getState().toast.error('Failed to copy URL');
    }
  };

  const handleOpenInCanvas = () => {
    setIsMenuOpen(false);
    if (!requestId) return;
    openInCanvas(requestId, {
      collectionId,
      request: {
        id: requestId,
        name: name || 'Untitled Request',
        method: method || 'GET',
        url: url || '',
        collectionId,
        folderId,
      },
      collectionName,
      folderName,
    });
  };

  const handleDuplicate = () => {
    setIsMenuOpen(false);
    onDuplicate?.();
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    if (window.confirm(`Are you sure you want to delete "${name || 'this request'}"?`)) {
      onDelete?.();
    }
  };

  const handleRevealBreadcrumb = (e) => {
    e.preventDefault();
    if (collectionId) {
      revealInCollection(requestId, {
        collectionId,
        folderIds: folderId ? [folderId] : [],
      });
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-[#111318] border-b border-[#232732] select-none min-h-[44px]',
        className
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
        {/* Breadcrumb Context with Instant Reveal */}
        {collectionName && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-slate-400 max-w-[280px] truncate shrink-0"
          >
            <FolderGit2 size={13} className="text-sky-400 shrink-0" />
            <button
              type="button"
              onClick={handleRevealBreadcrumb}
              className="truncate hover:text-sky-300 font-medium transition-colors cursor-pointer text-left"
              title={`Click to reveal in collection tree: ${collectionName}`}
            >
              {collectionName}
            </button>
            {folderName && (
              <>
                <span className="text-slate-600">/</span>
                <button
                  type="button"
                  onClick={handleRevealBreadcrumb}
                  className="truncate hover:text-sky-300 transition-colors cursor-pointer text-left"
                  title={`Click to reveal in collection tree: ${folderName}`}
                >
                  {folderName}
                </button>
              </>
            )}
            <span className="text-slate-600">/</span>
          </nav>
        )}

        {/* Request Name or Inline Editor */}
        {isEditing ? (
          <div className="flex items-center gap-1.5 flex-1 max-w-md">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveName}
              autoFocus
              className="px-2.5 py-1 bg-[#181b22] text-slate-100 text-sm font-semibold rounded border border-sky-500 focus:outline-none w-full shadow-inner"
              placeholder="Request Name"
              aria-label="Request Name"
            />
            <button
              type="button"
              onClick={handleSaveName}
              className="p-1 text-sky-400 hover:text-sky-300 hover:bg-[#181b22] rounded transition-colors cursor-pointer"
              title="Save Name (Enter)"
              aria-label="Save Name"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="p-1 text-slate-400 hover:text-slate-300 hover:bg-[#181b22] rounded transition-colors cursor-pointer"
              title="Cancel (Esc)"
              aria-label="Cancel editing"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onClick={handleStartEdit}
            className="group flex items-center gap-2 cursor-pointer py-1 px-1.5 -ml-1 rounded hover:bg-[#181b22] transition-colors truncate max-w-lg"
            title="Click to rename request"
          >
            <h1 className="text-sm font-semibold text-slate-100 truncate">
              {name || 'Untitled Request'}
            </h1>
            {isDirty && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                title="Unsaved changes"
                aria-label="Unsaved changes"
              />
            )}
            <Edit2
              size={12}
              className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {requestId && (
          <>
            <button
              type="button"
              onClick={handleOpenInCanvas}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
              title="Locate or open this request in Spatial API Canvas"
              aria-label="Open in Canvas"
            >
              <Workflow size={12} className="text-emerald-400" />
              <span className="hidden sm:inline">Canvas</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
              title="Export request as cURL command"
              aria-label="Export request"
            >
              <Terminal size={12} className="text-sky-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </>
        )}

        {/* More Actions Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={cn(
              'p-1.5 rounded bg-[#181b22] hover:bg-[#232732] border border-[#2b313e] text-slate-300 hover:text-white transition-colors cursor-pointer',
              isMenuOpen && 'bg-[#232732] text-white border-sky-500/50'
            )}
            title="More request actions"
            aria-label="More request actions"
            aria-expanded={isMenuOpen}
          >
            <MoreHorizontal size={14} />
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 w-48 bg-[#141720] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleCopyUrl}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
              >
                <Copy size={13} className="text-sky-400" />
                <span>Copy Request URL</span>
              </button>

              {onDuplicate && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDuplicate}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
                >
                  <CopyPlus size={13} className="text-indigo-400" />
                  <span>Duplicate Request</span>
                </button>
              )}

              {requestId && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleOpenInCanvas}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
                >
                  <Workflow size={13} className="text-emerald-400" />
                  <span>Open in Canvas</span>
                </button>
              )}

              {requestId && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsExportOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
                >
                  <Terminal size={13} className="text-amber-400" />
                  <span>Export cURL</span>
                </button>
              )}

              {onDelete && (
                <>
                  <div className="my-1 border-t border-[#232732]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Request</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <RequestSaveButton
          isSaving={isSaving}
          isDirty={isDirty}
          isError={isError}
          onSave={onSave}
        />
      </div>

      {isExportOpen && (
        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          workspaceId={workspaceId}
          requestId={requestId}
          requestName={name}
        />
      )}
    </div>
  );
}
