import { useState } from 'react';
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
import useRequestTabStore from '../../requests/store/requestTabStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { toast } from '../../../stores/toastStore';
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
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isExportCurlOpen, setIsExportCurlOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contextCoords, setContextCoords] = useState(null);

  const navigate = useNavigate();
  const openTab = useRequestTabStore((s) => s.openTab);
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  const isActive = activeRequestId === request.id;
  const methodColor = METHOD_COLORS[request.method] || 'text-slate-400';

  const updateMutation = useUpdateRequestMutation(workspaceId, collectionId, request.id);
  const deleteMutation = useDeleteRequestMutation(workspaceId, collectionId);
  const duplicateMutation = useDuplicateRequestMutation(workspaceId, collectionId);

  const handleRename = async (newName) => {
    await updateMutation.mutateAsync({ name: newName });
    toast.success(`Renamed to "${newName}"`);
  };

  const handleMove = async (newFolderId) => {
    await updateMutation.mutateAsync({ folderId: newFolderId });
    toast.success('Request moved successfully');
  };

  const handleDuplicate = async (customName) => {
    const duplicated = await duplicateMutation.mutateAsync();
    if (duplicated?.id) {
      if (customName && customName !== duplicated.name) {
        await updateMutation.mutateAsync({ name: customName });
        duplicated.name = customName;
      }

      openTab({
        workspaceId,
        collectionId,
        requestId: duplicated.id,
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
    openTab({
      workspaceId,
      collectionId,
      requestId: request.id,
      title: request.name,
      method: request.method,
    });
    navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`);
  };

  const handleOpenInCanvas = () => {
    addRequestNode(request, collectionName);
    toast.success(`Added "${request.name}" to Canvas`);
    navigate(`/workspace/${workspaceId}/canvas`);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextCoords({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        className={cn(
          'group flex items-center justify-between py-1 px-2 rounded transition-colors text-xs select-none cursor-pointer',
          isActive
            ? 'bg-sky-500/10 text-sky-300 font-medium border-l-2 border-sky-500 -ml-[2px]'
            : 'text-slate-300 hover:bg-[#181b22] hover:text-white'
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <Link
          to={`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`}
          className="flex items-center gap-2 flex-1 min-w-0 truncate py-0.5"
        >
          <span className={cn('font-mono font-bold text-[10px] w-8 flex-shrink-0', methodColor)}>
            {request.method}
          </span>
          <span className="truncate text-xs">{request.name}</span>
        </Link>

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
          onRename={() => setIsRenameOpen(true)}
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
          onRename={() => setIsRenameOpen(true)}
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

      <DuplicateRequestDialog
        isOpen={isDuplicateOpen}
        onClose={() => setIsDuplicateOpen(false)}
        request={request}
        onDuplicate={handleDuplicate}
      />

      <MoveItemDialog
        isOpen={isMoveOpen}
        onClose={() => setIsMoveOpen(false)}
        itemType="request"
        item={request}
        workspaceId={workspaceId}
        collectionId={collectionId}
        onMove={handleMove}
      />

      <ExportDialog
        isOpen={isExportCurlOpen}
        onClose={() => setIsExportCurlOpen(false)}
        workspaceId={workspaceId}
        requestId={request.id}
        requestName={request.name}
        initialTab="curl"
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Request"
        message={`Are you sure you want to delete "${request.name}"? This action cannot be undone.`}
      />
    </>
  );
}
