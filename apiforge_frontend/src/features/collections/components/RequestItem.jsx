import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CollectionContextMenu from './CollectionContextMenu';
import RenameDialog from './RenameDialog';
import MoveItemDialog from './MoveItemDialog';
import DuplicateRequestDialog from '../../requests/components/DuplicateRequestDialog';
import ExportDialog from '../../import-export/components/ExportDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import {
  useUpdateRequestMutation,
  useDeleteRequestMutation,
  useDuplicateRequestMutation,
} from '../../requests/hooks/useRequest';
import useCanvasStore from '../../canvas/store/canvasStore';
import { useResourceNavigation } from '../../../hooks/useResourceNavigation';
import { toast } from '../../../stores/toastStore';
import { doesRequestMatchFilters } from '../utils/collectionTreeUtils';
import useCollectionStore from '../store/collectionStore';
import { cn } from '../../../utils/cn';

const METHOD_COLORS = {
  GET: 'text-emerald-400',
  POST: 'text-amber-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-rose-400',
  HEAD: 'text-teal-400',
  OPTIONS: 'text-indigo-400',
};

export default function RequestItem({
  request,
  workspaceId,
  collectionId,
  collectionName = 'Collection',
  activeRequestId,
  isViewer = false,
  depth = 1,
  searchQuery = '',
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isInlineRenaming, setIsInlineRenaming] = useState(false);
  const [tempName, setTempName] = useState(request.name || '');
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isExportCurlOpen, setIsExportCurlOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contextCoords, setContextCoords] = useState(null);

  const itemRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  const isSelected = Boolean(useCollectionStore((s) => s.selectedRequests[request.id]));
  const toggleRequestSelected = useCollectionStore((s) => s.toggleRequestSelected);
  const selectedMethodFilter = useCollectionStore((s) => s.selectedMethodFilter);
  const hasAnySelection = Object.keys(useCollectionStore((s) => s.selectedRequests)).length > 0;

  const isActive = activeRequestId === request.id;
  const methodColor = METHOD_COLORS[request.method] || 'text-slate-400';

  // Auto-scroll active request into view
  useEffect(() => {
    if (isActive && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  // Focus and select text when entering inline rename mode
  useEffect(() => {
    if (isInlineRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isInlineRenaming]);

  const updateMutation = useUpdateRequestMutation(workspaceId, collectionId, request.id);
  const deleteMutation = useDeleteRequestMutation(workspaceId, collectionId);
  const duplicateMutation = useDuplicateRequestMutation(workspaceId, collectionId);

  const handleStartRename = () => {
    setTempName(request.name || '');
    setIsInlineRenaming(true);
  };

  const handleRename = async (newName) => {
    await updateMutation.mutateAsync({ name: newName });
    toast.success(`Renamed to "${newName}"`);
  };

  const handleInlineRenameSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = tempName.trim();
    if (!trimmed) {
      toast.error('Request name cannot be empty');
      setIsInlineRenaming(false);
      return;
    }
    if (trimmed !== request.name) {
      try {
        await updateMutation.mutateAsync({ name: trimmed });
        toast.success(`Renamed to "${trimmed}"`);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to rename request');
      }
    }
    setIsInlineRenaming(false);
  };

  const handleMove = async (newFolderId) => {
    await updateMutation.mutateAsync({ folderId: newFolderId });
    toast.success('Request moved successfully');
  };

  const { openRequest, openInCanvas } = useResourceNavigation(workspaceId);

  const handleDuplicate = async (customName) => {
    const duplicated = await duplicateMutation.mutateAsync();
    if (duplicated?.id) {
      if (customName && customName !== duplicated.name) {
        await updateMutation.mutateAsync({ name: customName });
        duplicated.name = customName;
      }

      openRequest(duplicated.id, {
        collectionId,
        title: duplicated.name || `${request.name} (Copy)`,
        method: duplicated.method || request.method || 'GET',
      });

      toast.success(`Duplicated "${request.name}"`);
      navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${duplicated.id}`);
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(request.id);
    setIsDeleteOpen(false);
    toast.success(`Deleted "${request.name}"`);
    if (isActive) {
      navigate(`/workspace/${workspaceId}`);
    }
  };

  const handleCopyUrl = async () => {
    if (!request.url) {
      toast.info('No URL configured on this request');
      return;
    }
    try {
      await navigator.clipboard.writeText(request.url);
      toast.success('Request URL copied to clipboard');
    } catch {
      toast.error('Failed to copy URL to clipboard');
    }
  };

  const handleOpenInNewTab = () => {
    openRequest(request.id, {
      collectionId,
      folderId: request.folderId,
      title: request.name,
      method: request.method,
      url: request.url,
    });
    navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`);
  };

  const handleOpenInCanvas = () => {
    addRequestNode(request, collectionName);
    toast.success(`Added "${request.name}" to Canvas`);
    navigate(`/workspace/${workspaceId}/canvas`);
    openInCanvas(request.id, {
      collectionId,
      request,
      collectionName,
      folderName: request.folderName,
    });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextCoords({ x: e.clientX, y: e.clientY });
  };

  const handleRowClick = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      toggleRequestSelected(request, collectionId);
    }
  };

  // Filter check against query and method filter
  if (!doesRequestMatchFilters(request, searchQuery, selectedMethodFilter)) {
    return null;
  }

  return (
    <>
      <div
        ref={itemRef}
        data-tree-item="request"
        data-request-id={request.id}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'group flex items-center justify-between py-1 px-2 rounded transition-colors text-xs select-none cursor-pointer',
          isSelected
            ? 'bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/40 font-medium'
            : isActive
            ? 'bg-sky-500/15 text-sky-200 font-semibold border-l-2 border-sky-400 -ml-[2px] shadow-xs'
            : 'text-slate-300 hover:bg-[#181b22] hover:text-white'
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {/* Selection Checkbox (visible on hover, or always when selected or selection mode active) */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            toggleRequestSelected(request, collectionId);
          }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-3.5 h-3.5 rounded border border-slate-600 bg-[#181b22] text-sky-500 focus:ring-0 cursor-pointer mr-1.5 shrink-0 transition-opacity',
            isSelected || hasAnySelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          aria-label={`Select request ${request.name}`}
        />

        {isInlineRenaming ? (
          <form onSubmit={handleInlineRenameSubmit} className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
            <span className={cn('font-mono font-bold text-[10px] w-8 flex-shrink-0', methodColor)}>
              {request.method}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleInlineRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setIsInlineRenaming(false);
                }
              }}
              className="bg-[#141720] text-slate-100 text-xs px-1.5 py-0.5 rounded border border-sky-500 w-full focus:outline-none shadow-inner"
              placeholder="Request Name"
              aria-label="Request Name"
            />
          </form>
        ) : (
          <Link
            to={`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`}
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                toggleRequestSelected(request, collectionId);
              }
            }}
            className="flex items-center gap-2 flex-1 min-w-0 truncate py-0.5"
            title={`${request.method} ${request.name}${request.url ? ` (${request.url})` : ''}`}
          >
            <span className={cn('font-mono font-bold text-[10px] w-8 flex-shrink-0', methodColor)}>
              {request.method}
            </span>
            <span className="truncate text-xs">{request.name}</span>
          </Link>
        )}

        {/* Action button menu trigger */}
        <CollectionContextMenu
          type="request"
          isViewer={isViewer}
          onOpen={() =>
            navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`)
          }
          onOpenInNewTab={handleOpenInNewTab}
          onCopyUrl={handleCopyUrl}
          onOpenInCanvas={handleOpenInCanvas}
          onExportCurl={() => setIsExportCurlOpen(true)}
          onDuplicate={() => setIsDuplicateOpen(true)}
          onRename={handleStartRename}
          onMove={() => setIsMoveOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
        />
      </div>

      {/* Right-click floating menu */}
      {contextCoords && (
        <CollectionContextMenu
          type="request"
          isViewer={isViewer}
          triggerCoords={contextCoords}
          onCloseExternal={() => setContextCoords(null)}
          onOpen={() =>
            navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`)
          }
          onOpenInNewTab={handleOpenInNewTab}
          onCopyUrl={handleCopyUrl}
          onOpenInCanvas={handleOpenInCanvas}
          onExportCurl={() => setIsExportCurlOpen(true)}
          onDuplicate={() => setIsDuplicateOpen(true)}
          onRename={handleStartRename}
          onMove={() => setIsMoveOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
        />
      )}

      <RenameDialog
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Request"
        initialName={request.name}
        onSave={handleRename}
      />

      {isMoveOpen && (
        <MoveItemDialog
          isOpen={isMoveOpen}
          onClose={() => setIsMoveOpen(false)}
          itemType="request"
          item={request}
          workspaceId={workspaceId}
          collectionId={collectionId}
          onMove={handleMove}
        />
      )}

      {isDuplicateOpen && (
        <DuplicateRequestDialog
          isOpen={isDuplicateOpen}
          onClose={() => setIsDuplicateOpen(false)}
          request={request}
          onDuplicate={handleDuplicate}
        />
      )}

      {isExportCurlOpen && (
        <ExportDialog
          isOpen={isExportCurlOpen}
          onClose={() => setIsExportCurlOpen(false)}
          workspaceId={workspaceId}
          requestId={request.id}
          requestName={request.name}
          initialTab="curl"
        />
      )}

      {isDeleteOpen && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          title={`Delete "${request.name}"?`}
          message="Are you sure you want to delete this request? This action cannot be undone."
          confirmLabel="Delete Request"
          isDestructive
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </>
  );
}
