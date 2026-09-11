import { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Loader2,
} from 'lucide-react';
import FolderItem from './FolderItem';
import RequestItem from './RequestItem';
import CollectionContextMenu from './CollectionContextMenu';
import CreateFolderDialog from './CreateFolderDialog';
import CreateRequestDialog from './CreateRequestDialog';
import RenameDialog from './RenameDialog';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import ImportDialog from '../../import-export/components/ImportDialog';
import useCollectionStore from '../store/collectionStore';
import { useFoldersQuery, useUpdateCollectionMutation, useDeleteCollectionMutation } from '../hooks/useCollections';
import { listRequests } from '../../requests/services/requestApi';
import { useQuery } from '@tanstack/react-query';

export default function CollectionItem({
  collection,
  workspaceId,
  activeRequestId,
}) {
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const expandedCollectionIds = useCollectionStore((s) => s.expandedCollectionIds);
  const toggleCollection = useCollectionStore((s) => s.toggleCollection);

  // Default to expanded if not explicitly set
  const isExpanded =
    expandedCollectionIds[collection.id] === undefined
      ? true
      : Boolean(expandedCollectionIds[collection.id]);

  const { data: folders = [] } = useFoldersQuery(workspaceId, collection.id);
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['requests', workspaceId, collection.id],
    queryFn: () => listRequests(workspaceId, collection.id),
    enabled: Boolean(workspaceId && collection.id),
  });

  const updateCollectionMutation = useUpdateCollectionMutation(workspaceId);
  const deleteCollectionMutation = useDeleteCollectionMutation(workspaceId);

  // Root requests (not in any folder)
  const rootRequests = requests.filter((r) => !r.folderId);

  const handleRename = async (newName) => {
    await updateCollectionMutation.mutateAsync({ collectionId: collection.id, name: newName });
  };

  const handleDelete = async () => {
    await deleteCollectionMutation.mutateAsync(collection.id);
    setIsDeleteOpen(false);
  };

  return (
    <>
      <div className="text-xs select-none">
        {/* Collection Header Row */}
        <div className="group flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#181b22] text-slate-300 transition-colors">
          <button
            type="button"
            onClick={() => toggleCollection(collection.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left truncate font-semibold py-0.5"
          >
            {isExpanded ? (
              <ChevronDown size={13} className="text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-slate-500 flex-shrink-0" />
            )}
            {isExpanded ? (
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

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setIsNewRequestOpen(true)}
              title="Add request"
              className="p-1 text-slate-500 hover:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity rounded"
            >
              <Plus size={12} />
            </button>

            <CollectionContextMenu
              type="collection"
              onNewRequest={() => setIsNewRequestOpen(true)}
              onImportCurl={() => setIsImportOpen(true)}
              onNewFolder={() => setIsNewFolderOpen(true)}
              onRename={() => setIsRenameOpen(true)}
              onDelete={() => setIsDeleteOpen(true)}
            />
          </div>
        </div>

        {/* Collection Contents (Folders + Root Requests) */}
        {isExpanded && (
          <div className="mt-0.5">
            {loadingRequests && (
              <div className="py-1 px-4 text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
                <Loader2 size={10} className="animate-spin" />
                <span>Loading requests...</span>
              </div>
            )}

            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                allRequests={requests}
                workspaceId={workspaceId}
                collectionId={collection.id}
                activeRequestId={activeRequestId}
                depth={1}
              />
            ))}

            {rootRequests.map((req) => (
              <RequestItem
                key={req.id}
                request={req}
                workspaceId={workspaceId}
                collectionId={collection.id}
                activeRequestId={activeRequestId}
                depth={1}
              />
            ))}

            {!loadingRequests && folders.length === 0 && rootRequests.length === 0 && (
              <div className="py-1.5 px-6 text-[11px] text-slate-500 italic">
                No requests or folders yet
              </div>
            )}
          </div>
        )}
      </div>

      <CreateFolderDialog
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        workspaceId={workspaceId}
        collectionId={collection.id}
        parentId={null}
        parentName={collection.name}
      />

      <CreateRequestDialog
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        workspaceId={workspaceId}
        collectionId={collection.id}
        folderId={null}
        targetName={collection.name}
      />

      <RenameDialog
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Collection"
        initialName={collection.name}
        onSave={handleRename}
      />

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        workspaceId={workspaceId}
        defaultCollectionId={collection.id}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Collection"
        message={`Are you sure you want to delete collection "${collection.name}" and all its contained folders and requests? This action cannot be undone.`}
      />
    </>
  );
}

