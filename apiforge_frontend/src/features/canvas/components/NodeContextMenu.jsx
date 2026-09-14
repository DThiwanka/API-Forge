import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, Maximize2, Link as LinkIcon, Download, Trash2 } from 'lucide-react';
import useCanvasStore from '../store/canvasStore';
import useRequestTabStore from '../../requests/store/requestTabStore';
import ExportDialog from '../../import-export/components/ExportDialog';
import { toast } from '../../../stores/toastStore';

export default function NodeContextMenu({ onSaveLayout }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const contextMenu = useCanvasStore((s) => s.contextMenu);
  const closeContextMenu = useCanvasStore((s) => s.closeContextMenu);
  const removeNodeFromCanvas = useCanvasStore((s) => s.removeNodeFromCanvas);
  const setFocusNodeId = useCanvasStore((s) => s.setFocusNodeId);
  const openTab = useRequestTabStore((s) => s.openTab);

  const [isExportCurlOpen, setIsExportCurlOpen] = useState(false);
  const [cachedNodeData, setCachedNodeData] = useState(null);

  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeContextMenu();
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    }

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.isOpen, closeContextMenu]);

  if (!contextMenu.isOpen && !isExportCurlOpen) {
    return null;
  }

  const { id, data } = contextMenu.node || (cachedNodeData ? { id: cachedNodeData.id, data: cachedNodeData } : {});
  const { requestId, collectionId, name, method, url } = data || {};

  const handleOpen = () => {
    closeContextMenu();
    if (workspaceId && collectionId && requestId) {
      navigate(
        `/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`
      );
    }
  };

  const handleOpenInNewTab = () => {
    closeContextMenu();
    if (workspaceId && collectionId && requestId) {
      openTab({
        workspaceId,
        collectionId,
        requestId,
        title: name,
        method,
        url,
      });
      navigate(
        `/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`
      );
    }
  };

  const handleFocusNode = () => {
    closeContextMenu();
    if (id) {
      setFocusNodeId(id);
    }
  };

  const handleCopyUrl = async () => {
    closeContextMenu();
    if (!url) {
      toast.info('No URL configured on this request');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Request URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL to clipboard');
    }
  };

  const handleExportCurl = () => {
    setCachedNodeData({ id, ...data });
    closeContextMenu();
    setIsExportCurlOpen(true);
  };

  const handleRemove = () => {
    closeContextMenu();
    removeNodeFromCanvas(id);
    if (onSaveLayout) onSaveLayout();
  };

  return (
    <>
      {contextMenu.isOpen && contextMenu.node && (
        <div
          ref={menuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-56 rounded-lg bg-[#14171f] border border-[#2b313e] shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 border-b border-[#232732] text-[10px] font-mono text-slate-400">
            CANVAS NODE ACTIONS
          </div>

          <button
            type="button"
            onClick={handleOpen}
            className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ExternalLink size={13} className="text-sky-400" />
            <span>Open Request</span>
          </button>

          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ExternalLink size={13} className="text-emerald-400" />
            <span>Open in Tab</span>
          </button>

          <button
            type="button"
            onClick={handleFocusNode}
            className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Maximize2 size={13} className="text-purple-400" />
            <span>Focus on Canvas</span>
          </button>

          <div className="my-1 border-t border-[#232732]" />

          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LinkIcon size={13} className="text-amber-400" />
            <span>Copy URL</span>
          </button>

          <button
            type="button"
            onClick={handleExportCurl}
            className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#1f242e] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download size={13} className="text-indigo-400" />
            <span>Export cURL</span>
          </button>

          <div className="my-1 border-t border-[#232732]" />

          <button
            type="button"
            onClick={handleRemove}
            className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Remove from Canvas</span>
          </button>
        </div>
      )}

      {/* Export Dialog Modal */}
      {isExportCurlOpen && cachedNodeData && (
        <ExportDialog
          isOpen={isExportCurlOpen}
          onClose={() => setIsExportCurlOpen(false)}
          targetType="request"
          targetData={{
            id: cachedNodeData.requestId,
            collectionId: cachedNodeData.collectionId,
            name: cachedNodeData.name,
            method: cachedNodeData.method,
            url: cachedNodeData.url,
          }}
        />
      )}
    </>
  );
}
