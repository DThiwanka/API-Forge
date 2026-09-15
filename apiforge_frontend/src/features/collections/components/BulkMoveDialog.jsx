import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { useCollectionsQuery, useFoldersQuery } from '../hooks/useCollections';
import {
  getRequest,
  createRequest,
  updateRequest,
  deleteRequest,
} from '../../requests/services/requestApi';
import useRequestTabStore from '../../requests/store/requestTabStore';
import { toast } from '../../../stores/toastStore';

function flattenFolderTree(folders = [], depth = 0) {
  const result = [];
  for (const f of folders) {
    result.push({
      id: f.id,
      name: `${'— '.repeat(depth)}${f.name}`,
    });
    if (f.children && f.children.length > 0) {
      result.push(...flattenFolderTree(f.children, depth + 1));
    }
  }
  return result;
}

export default function BulkMoveDialog({
  isOpen,
  onClose,
  selectedRequests = [],
  workspaceId,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const openTab = useRequestTabStore((s) => s.openTab);
  const closeTab = useRequestTabStore((s) => s.closeTab);
  const tabsByWorkspace = useRequestTabStore((s) => s.tabsByWorkspace);

  const { data: collections = [] } = useCollectionsQuery(workspaceId);

  // Default target collection to the collection of the first selected request or first available
  const initialCollectionId =
    selectedRequests[0]?.collectionId || (collections[0]?.id ?? '');

  const [targetCollectionId, setTargetCollectionId] = useState(initialCollectionId);
  const [targetFolderId, setTargetFolderId] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: folders = [] } = useFoldersQuery(workspaceId, targetCollectionId);

  const flatFolders = useMemo(() => flattenFolderTree(folders), [folders]);

  const count = selectedRequests.length;

  const handleMove = async (e) => {
    e?.preventDefault();
    if (!targetCollectionId || count === 0) return;

    setLoading(true);
    const destinationFolderId = targetFolderId === '' ? null : targetFolderId;

    try {
      const results = await Promise.allSettled(
        selectedRequests.map(async (req) => {
          if (req.collectionId === targetCollectionId) {
            // Same collection: direct folder update
            return updateRequest(workspaceId, req.collectionId, req.id, {
              folderId: destinationFolderId,
            });
          } else {
            // Cross-collection move: copy full request to destination then delete source
            const fullReq = await getRequest(workspaceId, req.collectionId, req.id);
            const created = await createRequest(workspaceId, targetCollectionId, {
              name: fullReq.name,
              method: fullReq.method,
              url: fullReq.url,
              folderId: destinationFolderId,
              queryParams: fullReq.queryParams,
              headers: fullReq.headers,
              auth: fullReq.auth,
              body: fullReq.body,
              settings: fullReq.settings,
            });
            await deleteRequest(workspaceId, req.collectionId, req.id);

            // If an open tab existed for the old request, open the new one
            const currentTabs = tabsByWorkspace[workspaceId] || [];
            const hasTab = currentTabs.some((t) => t.requestId === req.id);
            if (hasTab) {
              closeTab(workspaceId, req.id);
              openTab({
                workspaceId,
                collectionId: targetCollectionId,
                requestId: created.id,
                title: created.name,
                method: created.method,
                url: created.url,
              });
            }
            return created;
          }
        })
      );

      let successCount = 0;
      let failCount = 0;
      const affectedCollectionIds = new Set([targetCollectionId]);

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'fulfilled') {
          successCount += 1;
          affectedCollectionIds.add(selectedRequests[i].collectionId);
        } else {
          failCount += 1;
        }
      }

      // Invalidate caches
      for (const colId of affectedCollectionIds) {
        queryClient.invalidateQueries({
          queryKey: ['requests', workspaceId, colId],
        });
        queryClient.invalidateQueries({
          queryKey: ['folders', workspaceId, colId],
        });
      }

      if (failCount === 0) {
        toast.success(`Moved ${successCount} request${successCount === 1 ? '' : 's'}`);
      } else if (successCount > 0) {
        toast.info(
          `${successCount} request${successCount === 1 ? '' : 's'} moved, ${failCount} failed`
        );
      } else {
        toast.error('Failed to move selected requests');
      }

      onSuccess?.();
      onClose();
    } catch {
      toast.error('An unexpected error occurred during move');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Move ${count} Request${count === 1 ? '' : 's'}`}
    >
      <form onSubmit={handleMove} className="space-y-4">
        {/* Selected requests list preview */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Selected Requests ({count})
          </label>
          <div className="max-h-32 overflow-y-auto rounded border border-[#232732] bg-[#141720] p-2 space-y-1 text-xs">
            {selectedRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-2 py-0.5 px-1 rounded text-slate-300"
              >
                <span className="font-mono text-[10px] font-semibold text-slate-400 w-8 shrink-0">
                  {req.method}
                </span>
                <span className="truncate flex-1">{req.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Target Collection */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Destination Collection
          </label>
          <select
            value={targetCollectionId}
            onChange={(e) => {
              setTargetCollectionId(e.target.value);
              setTargetFolderId('');
            }}
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Target Folder */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Destination Folder
          </label>
          <select
            value={targetFolderId}
            onChange={(e) => setTargetFolderId(e.target.value)}
            className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="">Collection Root (Top Level)</option>
            {flatFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            className="text-xs bg-sky-600 hover:bg-sky-500 text-white"
          >
            Move {count} Request${count === 1 ? '' : 's'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

