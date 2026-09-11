import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export default function CollectionContextMenu({
  type = 'collection', // 'collection' | 'folder' | 'request'
  onNewFolder,
  onNewRequest,
  onImportCurl,
  onRename,
  onMove,
  onDuplicate,
  onDelete,
  onOpen,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
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
  }, [isOpen]);

  const handleAction = (actionFn) => {
    setIsOpen(false);
    actionFn?.();
  };

  return (
    <div className={cn('relative inline-block', className)} ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="More actions"
        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-[#232732] opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
      >
        <MoreVertical size={13} />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-44 bg-[#181b22] border border-[#2b313e] rounded-md shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs select-none"
        >
          {type === 'collection' && (
            <>
              {onNewRequest && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewRequest)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FilePlus size={13} className="text-sky-400" />
                  <span>New Request</span>
                </button>
              )}
              {onImportCurl && (
                <button
                  type="button"
                  onClick={() => handleAction(onImportCurl)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Download size={13} className="text-sky-400" />
                  <span>Import cURL</span>
                </button>
              )}
              {onNewFolder && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewFolder)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>New Folder</span>
                </button>
              )}
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

          {type === 'folder' && (
            <>
              {onNewRequest && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewRequest)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FilePlus size={13} className="text-sky-400" />
                  <span>New Request</span>
                </button>
              )}
              {onImportCurl && (
                <button
                  type="button"
                  onClick={() => handleAction(onImportCurl)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Download size={13} className="text-sky-400" />
                  <span>Import cURL</span>
                </button>
              )}
              {onNewFolder && (
                <button
                  type="button"
                  onClick={() => handleAction(onNewFolder)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>New Subfolder</span>
                </button>
              )}
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
              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => handleAction(onDuplicate)}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-[#232732] flex items-center gap-2"
                >
                  <Copy size={13} className="text-slate-400" />
                  <span>Duplicate</span>
                </button>
              )}
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
        </div>
      )}
    </div>
  );
}

