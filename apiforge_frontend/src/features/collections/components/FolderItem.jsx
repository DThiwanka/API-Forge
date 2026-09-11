import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import RequestItem from './RequestItem';
import CollectionContextMenu from './CollectionContextMenu';
import CreateFolderDialog from './CreateFolderDialog';
import CreateRequestDialog from './CreateRequestDialog';
import RenameDialog from './RenameDialog';
import MoveItemDialog from './MoveItemDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import useCollectionStore from '../store/collectionStore';
import {
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} from '../hooks/useCollections';

export default function FolderItem({
  folder,
  allRequests = [],
  workspaceId,
  collectionId,
  activeRequestId,
  depth = 1,
}) {
  const [isNewSubfolderOpen, setIsNewSubfolderOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const expandedFolderIds = useCollectionStore((s) => s.expandedFolderIds);
  const toggleFolder = useCollectionStore((s) => s.toggleFolder);

  const isExpanded = Boolean(expandedFolderIds[folder.id]);

  const updateFolderMutation = useUpdateFolderMutation(workspaceId, collectionId);
  const deleteFolderMutation = useDeleteFolderMutation(workspaceId, collectionId);

  // Folder's direct requests
  const folderRequests = allRequests.filter((r) => r.folderId === folder.id);
  const childFolders = folder.children || [];

  const handleRename = async (newName) => {
    await updateFolderMutation.mutateAsync({ folderId: folder.id, name: newName });
  };

  const handleMove = async (newParentId) => {
    await updateFolderMutation.mutateAsync({ folderId: folder.id, parentId: newParentId });
  };

  const handleDelete = async () => {
    await deleteFolderMutation.mutateAsync(folder.id);
    setIsDeleteOpen(false);
  };

  return (
    <>
      <div className="text-xs select-none">
        {/* Folder Header Row */}
        <div
          className="group flex items-center justify-between py-1 px-2 rounded hover:bg-[#181b22] text-slate-300 transition-colors"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left truncate font-medium py-0.5"
          >
            {isExpanded ? (
              <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronRight size={12} className="text-slate-500 flex-shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen size={13} className="text-amber-400 flex-shrink-0" />
            ) : (
              <Folder size={13} className="text-amber-400 flex-shrink-0" />
            )}
            <span className="truncate text-slate-200">{folder.name}</span>
          </button>

          <CollectionContextMenu
            type="folder"
            onNewFolder={() => setIsNewSubfolderOpen(true)}
            onNewRequest={() => setIsNewRequestOpen(true)}
            onRename={() => setIsRenameOpen(true)}
            onMove={() => setIsMoveOpen(true)}
            onDelete={() => setIsDeleteOpen(true)}
          />
        </div>

        {/* Nested Folders & Requests */}
        {isExpanded && (
          <div>
            {childFolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                allRequests={allRequests}
                workspaceId={workspaceId}
                collectionId={collectionId}
                activeRequestId={activeRequestId}
                depth={depth + 1}
              />
            ))}

            {folderRequests.map((req) => (
              <RequestItem
                key={req.id}
                request={req}
                workspaceId={workspaceId}
                collectionId={collectionId}
                activeRequestId={activeRequestId}
                depth={depth + 1}
              />
            ))}

            {childFolders.length === 0 && folderRequests.length === 0 && (
              <div
                className="py-1 text-[11px] text-slate-500 italic"
                style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
              >
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>

      <CreateFolderDialog
        isOpen={isNewSubfolderOpen}
        onClose={() => setIsNewSubfolderOpen(false)}
        workspaceId={workspaceId}
        collectionId={collectionId}
        parentId={folder.id}
        parentName={folder.name}
      />

      <CreateRequestDialog
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        workspaceId={workspaceId}
        collectionId={collectionId}
        folderId={folder.id}
        targetName={folder.name}
      />

      <RenameDialog
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Folder"
        initialName={folder.name}
        onSave={handleRename}
      />

      <MoveItemDialog
        isOpen={isMoveOpen}
        onClose={() => setIsMoveOpen(false)}
        itemType="folder"
        item={folder}
        workspaceId={workspaceId}
        collectionId={collectionId}
        onMove={handleMove}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Folder"
        message={`Are you sure you want to delete folder "${folder.name}" and all its contents? This cannot be undone.`}
      />
    </>
  );
}

