import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CollectionContextMenu from './CollectionContextMenu';
import RenameDialog from './RenameDialog';
import MoveItemDialog from './MoveItemDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import {
  useUpdateRequestMutation,
  useDeleteRequestMutation,
  useDuplicateRequestMutation,
} from '../../requests/hooks/useRequest';
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
  activeRequestId,
  depth = 1,
}) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const navigate = useNavigate();

  const isActive = activeRequestId === request.id;
  const methodColor = METHOD_COLORS[request.method] || 'text-slate-400';

  const updateMutation = useUpdateRequestMutation(workspaceId, collectionId, request.id);
  const deleteMutation = useDeleteRequestMutation(workspaceId, collectionId);
  const duplicateMutation = useDuplicateRequestMutation(workspaceId, collectionId);

  const handleRename = async (newName) => {
    await updateMutation.mutateAsync({ name: newName });
  };

  const handleMove = async (newFolderId) => {
    await updateMutation.mutateAsync({ folderId: newFolderId });
  };

  const handleDuplicate = async () => {
    const duplicated = await duplicateMutation.mutateAsync();
    if (duplicated?.id) {
      navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${duplicated.id}`);
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(request.id);
    setIsDeleteOpen(false);
    if (isActive) {
      navigate(`/workspace/${workspaceId}`);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-center justify-between py-1 px-2 rounded transition-colors text-xs select-none',
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

        <CollectionContextMenu
          type="request"
          onOpen={() =>
            navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${request.id}`)
          }
          onDuplicate={handleDuplicate}
          onRename={() => setIsRenameOpen(true)}
          onMove={() => setIsMoveOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
        />
      </div>

      <RenameDialog
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Request"
        initialName={request.name}
        onSave={handleRename}
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

