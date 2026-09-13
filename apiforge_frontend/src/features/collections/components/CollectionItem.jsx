import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react';
import FolderItem from './FolderItem';
import RequestItem from './RequestItem';
import CollectionContextMenu from './CollectionContextMenu';
import CreateFolderDialog from './CreateFolderDialog';
import CreateRequestDialog from './CreateRequestDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ImportDialog from '../../import-export/components/ImportDialog';
import ExportDialog from '../../import-export/components/ExportDialog';
import useCollectionStore from '../store/collectionStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { toast } from '../../../stores/toastStore';
import { useFoldersQuery, useUpdateCollectionMutation, useDeleteCollectionMutation } from '../hooks/useCollections';
import { listRequests } from '../../requests/services/requestApi';
import { useQuery } from '@tanstack/react-query';
import { doesCollectionMatch, findAncestorFolderIds } from '../utils/collectionTreeUtils';

export default function CollectionItem({
  collection,
  workspaceId,
  activeRequestId,
  isViewer = false,
  searchQuery = '',
}) {
  const navigate = useNavigate();
  const [isInlineRenaming, setIsInlineRenaming] = useState(false);
  const [tempName, setTempName] = useState(collection.name || '');
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contextCoords, setContextCoords] = useState(null);

  const inputRef = useRef(null);

  const expandedCollectionIds = useCollectionStore((s) => s.expandedCollectionIds);
  const toggleCollection = useCollectionStore((s) => s.toggleCollection);
  const expandCollection = useCollectionStore((s) => s.expandCollection);
  const revealAncestors = useCollectionStore((s) => s.revealAncestors);

  // Default to expanded if not explicitly set
  const isExpanded =
    expandedCollectionIds[collection.id] === undefined
      ? true
      : Boolean(expandedCollectionIds[collection.id]);

  const { data: folders = [] } = useFoldersQuery(workspaceId, collection.id);
  const { data: requests = [] } = useQuery({
    queryKey: ['requests', workspaceId, collection.id],
    queryFn: () => listRequests(workspaceId, collection.id),
    enabled: Boolean(workspaceId && collection.id),
  });

  const updateCollectionMutation = useUpdateCollectionMutation(workspaceId);
  const deleteCollectionMutation = useDeleteCollectionMutation(workspaceId);

  // Root requests (not in any folder)
  const rootRequests = requests.filter((r) => !r.folderId);

  // Search filtering
  const matchesSearch = doesCollectionMatch(collection, folders, requests, searchQuery);

  // Auto-reveal active request if inside this collection
  const activeRequest = requests.find((r) => r.id === activeRequestId);

  useEffect(() => {
    if (activeRequest) {
      if (activeRequest.folderId) {
        const ancestors = findAncestorFolderIds(folders, activeRequest.folderId);
        revealAncestors(collection.id, [...ancestors, activeRequest.folderId]);
      } else {
        expandCollection(collection.id);
      }
    }
  }, [activeRequest, collection.id, folders, expandCollection, revealAncestors]);

  const handleStartRename = () => {
    setTempName(collection.name || '');
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

  if (searchQuery && !matchesSearch) {
    return null;
  }

  // If search query is active and matches, treat as effectively expanded
  const effectiveExpanded = searchQuery ? true : isExpanded;

  const handleInlineRenameSubmit = async (e) => {
    e?.preventDefault();
    const trimmed = tempName.trim();
    if (!trimmed) {
      toast.error('Collection name cannot be empty');
      setIsInlineRenaming(false);
      return;
    }
    if (trimmed !== collection.name) {
      try {
        await updateCollectionMutation.mutateAsync({ collectionId: collection.id, name: trimmed });
        toast.success(`Renamed collection to "${trimmed}"`);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to rename collection');
      }
    }
    setIsInlineRenaming(false);
  };

  const handleDelete = async () => {
    await deleteCollectionMutation.mutateAsync(collection.id);
    setIsDeleteOpen(false);
    toast.success(`Deleted collection "${collection.name}"`);
  };

  const handleOpenInCanvas = () => {
    if (requests.length === 0) {
      toast.info(`Collection "${collection.name}" has no requests to open in Canvas`);
      return;
    }
    useCanvasStore.getState().addCollectionNodes(requests, collection.name);
    toast.success(`Added ${requests.length} requests from "${collection.name}" to Canvas`);
    navigate(`/workspace/${workspaceId}/canvas`);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextCoords({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <div className="text-xs select-none">
        {/* Collection Header Row */}
        <div
          data-tree-item="collection"
          data-collection-id={collection.id}
          onContextMenu={handleContextMenu}
          className="group flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#181b22] text-slate-300 transition-colors"
        >
          {isInlineRenaming ? (
            <form onSubmit={handleInlineRenameSubmit} className="flex items-center gap-1.5 flex-1 min-w-0 mr-1">
              <FolderOpen size={14} className="text-sky-400 shrink-0" />
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
                className="bg-[#141720] text-slate-100 text-xs px-1.5 py-0.5 rounded border border-sky-500 w-full focus:outline-none shadow-inner font-semibold"
                placeholder="Collection Name"
                aria-label="Collection Name"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => toggleCollection(collection.id)}
              className="flex items-center gap-1.5 flex-1 min-w-0 text-left truncate font-semibold py-0.5 cursor-pointer"
            >
              {effectiveExpanded ? (
                <ChevronDown size={13} className="text-slate-500 flex-shrink-0" />
              ) : (
                <ChevronRight size={13} className="text-slate-500 flex-shrink-0" />
              )}
              {effectiveExpanded ? (
                <FolderOpen size={14} className="text-sky-400 flex-shrink-0" />
              ) : (
                <Folder size={14} className="text-sky-400 flex-shrink-0" />
              )}
              <span className="truncate text-slate-100">{collection.name}</span>

              {requests.length > 0 && (
                <span className="text-[10px] text-slate-500 font-mono font-normal ml-1">
                  ({requests.length})
                </span>
              )}
            </button>
          )}

          <div className="flex items-center gap-0.5">
            {!isViewer && (
              <button
                type="button"
                onClick={() => setIsNewRequestOpen(true)}
                title="Add request to collection"
                className="p-1 text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
              >
                <Plus size={12} />
              </button>
            )}

            <CollectionContextMenu
              type="collection"
              isViewer={isViewer}
              onRunCollection={() =>
                navigate(`/workspace/${workspaceId}/runner?collectionId=${collection.id}`)
              }
              onOpenInCanvas={handleOpenInCanvas}
              onNewRequest={() => setIsNewRequestOpen(true)}
              onImportCurl={() => setIsImportOpen(true)}
              onExport={() => setIsExportOpen(true)}
              onNewFolder={() => setIsNewFolderOpen(true)}
              onRename={handleStartRename}
              onDelete={() => setIsDeleteOpen(true)}
            />

            {contextCoords && (
              <CollectionContextMenu
                type="collection"
                isViewer={isViewer}
                triggerCoords={contextCoords}
                onCloseExternal={() => setContextCoords(null)}
                onRunCollection={() =>
                  navigate(`/workspace/${workspaceId}/runner?collectionId=${collection.id}`)
                }
                onOpenInCanvas={handleOpenInCanvas}
                onNewRequest={() => setIsNewRequestOpen(true)}
                onImportCurl={() => setIsImportOpen(true)}
                onExport={() => setIsExportOpen(true)}
                onNewFolder={() => setIsNewFolderOpen(true)}
                onRename={handleStartRename}
                onDelete={() => setIsDeleteOpen(true)}
              />
            )}
          </div>
        </div>

        {/* Collection Contents (Folders and Root Requests) */}
        {effectiveExpanded && (
          <div className="space-y-0.5">
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                allRequests={requests}
                workspaceId={workspaceId}
                collectionId={collection.id}
                collectionName={collection.name}
                activeRequestId={activeRequestId}
                isViewer={isViewer}
                depth={1}
                searchQuery={searchQuery}
              />
            ))}

            {rootRequests.map((req) => (
              <RequestItem
                key={req.id}
                request={req}
                workspaceId={workspaceId}
                collectionId={collection.id}
                collectionName={collection.name}
                activeRequestId={activeRequestId}
                isViewer={isViewer}
                depth={1}
                searchQuery={searchQuery}
              />
            ))}

            {folders.length === 0 && rootRequests.length === 0 && !searchQuery && (
              <div className="py-1 px-2 text-[11px] text-slate-500 italic pl-6">
                Empty collection
              </div>
            )}
          </div>
        )}
      </div>

      {isNewFolderOpen && (
        <CreateFolderDialog
          isOpen={isNewFolderOpen}
          onClose={() => setIsNewFolderOpen(false)}
          workspaceId={workspaceId}
          collectionId={collection.id}
        />
      )}

      {isNewRequestOpen && (
        <CreateRequestDialog
          isOpen={isNewRequestOpen}
          onClose={() => setIsNewRequestOpen(false)}
          workspaceId={workspaceId}
          collectionId={collection.id}
        />
      )}

      {isImportOpen && (
        <ImportDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          workspaceId={workspaceId}
          collectionId={collection.id}
        />
      )}

      {isExportOpen && (
        <ExportDialog
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          workspaceId={workspaceId}
          collectionId={collection.id}
          collectionName={collection.name}
        />
      )}

      {isDeleteOpen && (
        <ConfirmDialog
          isOpen={isDeleteOpen}
          title={`Delete "${collection.name}"?`}
          message="Are you sure you want to delete this collection and all its folders and requests? This action cannot be undone."
          confirmLabel="Delete Collection"
          isDestructive
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
          isLoading={deleteCollectionMutation.isPending}
        />
      )}
    </>
  );
}
