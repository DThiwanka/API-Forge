import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import MoveItemDialog from './MoveItemDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import useCollectionStore from '../store/collectionStore';
import {
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} from '../hooks/useCollections';
import { toast } from '../../../stores/toastStore';
import { doesFolderMatch } from '../utils/collectionTreeUtils';

export default function FolderItem({
  folder,
  allRequests = [],
  workspaceId,
  collectionId,
  collectionName = 'Collection',
  activeRequestId,
  isViewer = false,
  depth = 1,
  searchQuery = '',
}) {
  const navigate = useNavigate();
  const [isInlineRenaming, setIsInlineRenaming] = useState(false);
  const [tempName, setTempName] = useState(folder.name || '');
  const [isNewSubfolderOpen, setIsNewSubfolderOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contextCoords, setContextCoords] = useState(null);

  const inputRef = useRef(null);

  const expandedFolderIds = useCollectionStore((s) => s.expandedFolderIds);
  const toggleFolder = useCollectionStore((s) => s.toggleFolder);
  const expandFolder = useCollectionStore((s) => s.expandFolder);

  const isExpanded = Boolean(expandedFolderIds[folder.id]);

  // Folder's direct requests
  const folderRequests = allRequests.filter((r) => r.folderId === folder.id);
  const childFolders = folder.children || [];

  // Search filtering
  const matchesSearch = doesFolderMatch(folder, allRequests, searchQuery);

  // Auto-expand if active request is inside
  const hasActiveRequest = folderRequests.some((r) => r.id === activeRequestId);

  useEffect(() => {
    if (hasActiveRequest && !isExpanded) {
      expandFolder(folder.id);
    }
  }, [hasActiveRequest, isExpanded, expandFolder, folder.id]);

  const handleStartRename = () => {
    setTempName(folder.name || '');
    setIsInlineRenaming(true);
  };

  // Focus and select text when entering inline rename mode
  useEffect(() => {
    if (isInlineRenaming) {
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [isInlineRenaming]);

  const updateFolderMutation = useUpdateFolderMutation(workspaceId, collectionId);
  const deleteFolderMutation = useDeleteFolderMutation(workspaceId, collectionId);

  if (searchQuery && !matchesSearch) {
    return null;
  }

  // If search query is active and matches inside, treat as effectively expanded
  const effectiveExpanded = searchQuery ? true : isExpanded;

  const handleInlineRenameSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = tempName.trim();
    if (!trimmed) {
      toast.error('Folder name cannot be empty');
      setIsInlineRenaming(false);
      return;
    }
    if (trimmed !== folder.name) {
      try {
        await updateFolderMutation.mutateAsync({ folderId: folder.id, name: trimmed });
        toast.success(`Renamed folder to "${trimmed}"`);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to rename folder');
      }
    }
    setIsInlineRenaming(false);
  };

  const handleMove = async (newParentId) => {
    await updateFolderMutation.mutateAsync({ folderId: folder.id, parentId: newParentId });
    toast.success('Folder moved successfully');
  };

  const handleDelete = async () => {
    await deleteFolderMutation.mutateAsync(folder.id);
    setIsDeleteOpen(false);
    toast.success(`Deleted folder "${folder.name}"`);
  };

  const handleRunFolder = () => {
    navigate(`/workspace/${workspaceId}/runner?collectionId=${collectionId}&folderId=${folder.id}`);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextCoords({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div className="text-xs select-none">
        {/* Folder Header Row */}
        <div
          data-tree-item="folder"
          data-folder-id={folder.id}
          onContextMenu={handleContextMenu}
          className="group flex items-center justify-between py-1 px-2 rounded hover:bg-[#181b22] text-slate-300 transition-colors"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {isInlineRenaming ? (
            <form onSubmit={handleInlineRenameSubmit} className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
              <FolderOpen size={13} className="text-amber-400 shrink-0" />
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
                placeholder="Folder Name"
                aria-label="Folder Name"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => toggleFolder(folder.id)}
              className="flex items-center gap-1.5 flex-1 min-w-0 text-left truncate font-medium py-0.5 cursor-pointer"
            >
              {effectiveExpanded ? (
                <ChevronDown size={12} className="text-slate-500 shrink-0" />
              ) : (
                <ChevronRight size={12} className="text-slate-500 shrink-0" />
              )}
              {effectiveExpanded ? (
                <FolderOpen size={13} className="text-amber-400 shrink-0" />
              ) : (
                <Folder size={13} className="text-amber-400 shrink-0" />
              )}
              <span className="truncate text-slate-200">{folder.name}</span>

              {folderRequests.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono font-normal ml-1">
                  ({folderRequests.length})
                </span>
              )}
            </button>
          )}

          <CollectionContextMenu
            type="folder"
            isViewer={isViewer}
            onRunFolder={handleRunFolder}
            onNewFolder={() => setIsNewSubfolderOpen(true)}
            onNewRequest={() => setIsNewRequestOpen(true)}
            onRename={handleStartRename}
            onMove={() => setIsMoveOpen(true)}
            onDelete={() => setIsDeleteOpen(true)}
          />

          {contextCoords && (
            <CollectionContextMenu
              type="folder"
              isViewer={isViewer}
              triggerCoords={contextCoords}
              onCloseExternal={() => setContextCoords(null)}
              onRunFolder={handleRunFolder}
              onNewFolder={() => setIsNewSubfolderOpen(true)}
              onNewRequest={() => setIsNewRequestOpen(true)}
              onRename={handleStartRename}
              onMove={() => setIsMoveOpen(true)}
              onDelete={() => setIsDeleteOpen(true)}
            />
          )}
        </div>

        {/* Nested Folders & Requests */}
        {effectiveExpanded && (
          <div>
            {childFolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                allRequests={allRequests}
                workspaceId={workspaceId}
                collectionId={collectionId}
                collectionName={collectionName}
                activeRequestId={activeRequestId}
                isViewer={isViewer}
                depth={depth + 1}
                searchQuery={searchQuery}
              />
            ))}

            {folderRequests.map((req) => (
              <RequestItem
                key={req.id}
                request={req}
                workspaceId={workspaceId}
                collectionId={collectionId}
                collectionName={collectionName}
                activeRequestId={activeRequestId}
                isViewer={isViewer}
                depth={depth + 1}
                searchQuery={searchQuery}
              />
            ))}

            {childFolders.length === 0 && folderRequests.length === 0 && !searchQuery && (
              <div
                className="py-1 px-2 text-[11px] text-slate-500 italic"
                style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}
              >
                Empty folder
              </div>
            )}
          </div>
        )}
      </div>

      {isNewSubfolderOpen && (
        <CreateFolderDialog
          isOpen={isNewSubfolderOpen}
          onClose={() => setIsNewSubfolderOpen(false)}
          workspaceId={workspaceId}
          collectionId={collectionId}
          parentId={folder.id}
        />
      )}

      {isNewRequestOpen && (
        <CreateRequestDialog
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
          workspaceId={workspaceId}
          collectionId={collectionId}
          folderId={folder.id}
        />
      )}

      {isMoveOpen && (
        <MoveItemDialog
          isOpen={isMoveOpen}
          onClose={() => setIsMoveOpen(false)}
          itemType="folder"
          item={folder}
          workspaceId={workspaceId}
          collectionId={collectionId}
          onMove={handleMove}
        />
      )}

      {isDeleteOpen && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          title={`Delete "${folder.name}"?`}
          message="Are you sure you want to delete this folder and its nested resources?"
          confirmLabel="Delete Folder"
          isDestructive
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
          isLoading={deleteFolderMutation.isPending}
        />
      )}
    </>
  );
}
