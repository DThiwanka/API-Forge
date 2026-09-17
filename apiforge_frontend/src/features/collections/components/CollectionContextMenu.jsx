import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreVertical,
  FolderPlus,
  FilePlus,
  Edit2,
  Trash2,
  Copy,
  Move,
  ExternalLink,
  Download,
  Upload,
  Play,
  Share2,
  Sparkles,
  Link as LinkIcon,
  Info,
  Compass,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function CollectionContextMenu({
  type = 'collection', // 'collection' | 'folder' | 'request'
  onOverview,
  onRunCollection,
  onRunFolder,
  onNewFolder,
  onNewRequest,
  onImportCurl,
  onExport,
  onExportCurl,
  onRename,
  onMove,
  onDuplicate,
  onDelete,
  onOpen,
  onOpenInNewTab,
  onOpenInCanvas,
  onOpenInBrowser,
  onCopyUrl,
  isViewer = false,
  triggerCoords = null, // { x, y } if triggered via right-click
  onCloseExternal,
  className,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const menuRef = useRef(null);

  const isExplicitCoordinates = Boolean(triggerCoords && typeof triggerCoords.x === 'number');
  const isOpen = isExplicitCoordinates ? true : internalOpen;

  const handleClose = useCallback(() => {
    if (isExplicitCoordinates && onCloseExternal) {
      onCloseExternal();
    } else {
      setInternalOpen(false);
    }
  }, [isExplicitCoordinates, onCloseExternal]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        handleClose();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        handleClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const handleAction = (actionFn) => {
    handleClose();
    actionFn?.();
  };

  // Adjust coordinates if menu rendered at mouse pointer
  const menuStyle = isExplicitCoordinates
    ? {
        position: 'fixed',
        left: `${Math.min(triggerCoords.x, window.innerWidth - 200)}px`,
        top: `${Math.min(triggerCoords.y, window.innerHeight - 260)}px`,
        zIndex: 9999,
      }
    : undefined;

  return (
    <div className={cn('relative inline-block', className)} ref={menuRef}>
      {!isExplicitCoordinates && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInternalOpen(!internalOpen);
          }}
          title="More actions"
          className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-[#232732] opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
        >
          <MoreVertical size={13} />
        </button>
      )}

      {isOpen && (
        <div
          style={menuStyle}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-48 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100',
            !isExplicitCoordinates && 'absolute right-0 top-full mt-1 z-50'
          )}
        >
          {type === 'collection' && (
            <>
              {onOverview && (
                <button
                  type="button"
                  onClick={() => handleAction(onOverview)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Info size={13} className="text-sky-400" />
                  <span>Overview</span>
                </button>
              )}
              {onRunCollection && (
                <button
                  type="button"
                  onClick={() => handleAction(onRunCollection)}
                  className="w-full px-3 py-1.5 text-left text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 flex items-center gap-2"
                >
                  <Play size={13} className="text-emerald-400 fill-emerald-400/20" />
                  <span>Run Collection</span>
                </button>
              )}
              {onOpenInCanvas && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenInCanvas)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Sparkles size={13} className="text-sky-400" />
                  <span>Open in Canvas</span>
                </button>
              )}
              {!isViewer && onNewRequest && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewRequest)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FilePlus size={13} className="text-sky-400" />
                  <span>New Request</span>
                </button>
              )}
              {!isViewer && onNewFolder && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewFolder)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>New Folder</span>
                </button>
              )}
              {!isViewer && onImportCurl && (
                <button
                  type="button"
                  onClick={() => handleAction(onImportCurl)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Download size={13} className="text-sky-400" />
                  <span>Import cURL</span>
                </button>
              )}
              {onExport && (
                <button
                  type="button"
                  onClick={() => handleAction(onExport)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Upload size={13} className="text-sky-400" />
                  <span>Export OpenAPI</span>
                </button>
              )}
              {!isViewer && (
                <>
                  <div className="h-px bg-[#232732] my-1" />
                  {onRename && (
                    <button
                      type="button"
                      onClick={() => handleAction(onRename)}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                    >
                      <Edit2 size={13} className="text-slate-400" />
                      <span>Rename</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => handleAction(onDelete)}
                      className="w-full px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {type === 'folder' && (
            <>
              {onRunFolder && (
                <button
                  type="button"
                  onClick={() => handleAction(onRunFolder)}
                  className="w-full px-3 py-1.5 text-left text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 flex items-center gap-2"
                >
                  <Play size={13} className="text-emerald-400 fill-emerald-400/20" />
                  <span>Run Folder</span>
                </button>
              )}
              {!isViewer && onNewRequest && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewRequest)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FilePlus size={13} className="text-sky-400" />
                  <span>New Request</span>
                </button>
              )}
              {!isViewer && onNewFolder && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewFolder)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>New Subfolder</span>
                </button>
              )}
              {!isViewer && onImportCurl && (
                <button
                  type="button"
                  onClick={() => handleAction(onImportCurl)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Download size={13} className="text-sky-400" />
                  <span>Import cURL</span>
                </button>
              )}
              {!isViewer && (
                <>
                  <div className="h-px bg-[#232732] my-1" />
                  {onMove && (
                    <button
                      type="button"
                      onClick={() => handleAction(onMove)}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                    >
                      <Move size={13} className="text-slate-400" />
                      <span>Move</span>
                    </button>
                  )}
                  {onRename && (
                    <button
                      type="button"
                      onClick={() => handleAction(onRename)}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                    >
                      <Edit2 size={13} className="text-slate-400" />
                      <span>Rename</span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => handleAction(onDelete)}
                      className="w-full px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {type === 'request' && (
            <>
              {onOpen && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpen)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <ExternalLink size={13} className="text-sky-400" />
                  <span>Open</span>
                </button>
              )}
              {onOpenInNewTab && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenInNewTab)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Share2 size={13} className="text-slate-400" />
                  <span>Open in New Tab</span>
                </button>
              )}
              {onCopyUrl && (
                <button
                  type="button"
                  onClick={() => handleAction(onCopyUrl)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <LinkIcon size={13} className="text-slate-400" />
                  <span>Copy URL</span>
                </button>
              )}
              {onOpenInCanvas && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenInCanvas)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Sparkles size={13} className="text-sky-400" />
                  <span>Open in Canvas</span>
                </button>
              )}
              {onOpenInBrowser && (
                <button
                  type="button"
                  onClick={() => handleAction(onOpenInBrowser)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Compass size={13} className="text-teal-400" />
                  <span>Open in Browser</span>
                </button>
              )}
              {onExportCurl && (
                <button
                  type="button"
                  onClick={() => handleAction(onExportCurl)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Download size={13} className="text-sky-400" />
                  <span>Export cURL</span>
                </button>
              )}
              {!isViewer && onDuplicate && (
                <button
                  type="button"
                  onClick={() => handleAction(onDuplicate)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Copy size={13} className="text-slate-400" />
                  <span>Duplicate...</span>
                </button>
              )}
              {!isViewer && onMove && (
                <button
                  type="button"
                  onClick={() => handleAction(onMove)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Move size={13} className="text-slate-400" />
                  <span>Move</span>
                </button>
              )}
              {!isViewer && onRename && (
                <button
                  type="button"
                  onClick={() => handleAction(onRename)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Edit2 size={13} className="text-slate-400" />
                  <span>Rename</span>
                </button>
              )}
              {!isViewer && (
                <>
                  <div className="h-px bg-[#232732] my-1" />
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => handleAction(onDelete)}
                      className="w-full px-3 py-1.5 text-left text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 flex items-center gap-2"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
