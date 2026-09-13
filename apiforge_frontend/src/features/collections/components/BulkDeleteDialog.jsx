import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Dialog from '../../../components/ui/Dialog';
import Button from '../../../components/ui/Button';
import { deleteRequest } from '../../requests/services/requestApi';
import useRequestTabStore from '../../requests/store/requestTabStore';
import useCanvasStore from '../../canvas/store/canvasStore';
import { toast } from '../../../stores/toastStore';
import { AlertTriangle } from 'lucide-react';

export default function BulkDeleteDialog({
  isOpen,
  onClose,
  selectedRequests = [],
  workspaceId,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const closeTab = useRequestTabStore((s) => s.closeTab);
  const removeNodeFromCanvas = useCanvasStore((s) => s.removeNodeFromCanvas);

  const count = selectedRequests.length;

  const handleDelete = async () => {
    if (count === 0) return;
    setLoading(true);

    try {
      const results = await Promise.allSettled(
        selectedRequests.map((req) =>
          deleteRequest(workspaceId, req.collectionId, req.id).then(() => req)
        )
      );

      let successCount = 0;
      let failCount = 0;
      const affectedCollectionIds = new Set();

      for (const res of results) {
        if (res.status === 'fulfilled') {
          successCount += 1;
          const req = res.value;
          affectedCollectionIds.add(req.collectionId);
          // Close tab if open
          closeTab(workspaceId, req.id);
          // Remove from canvas if present
          removeNodeFromCanvas(req.id);
        } else {
          failCount += 1;
        }
      }

      // Invalidate query caches for affected collections
      for (const colId of affectedCollectionIds) {
        queryClient.invalidateQueries({
          queryKey: ['requests', workspaceId, colId],
        });
      }

      if (failCount === 0) {
        toast.success(`Deleted ${successCount} request${successCount === 1 ? '' : 's'}`);
      } else if (successCount > 0) {
        toast.info(
          `${successCount} request${successCount === 1 ? '' : 's'} deleted, ${failCount} failed`
        );
      } else {
        toast.error('Failed to delete selected requests');
      }

      onSuccess?.();
      onClose();
    } catch {
      toast.error('An unexpected error occurred during bulk deletion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${count} Request${count === 1 ? '' : 's'}?`}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded bg-rose-950/30 border border-rose-800/40 text-rose-200">
          <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-medium text-rose-300">
              This action is permanent and cannot be undone.
            </p>
            <p className="text-rose-400/80">
              The {count} selected request{count === 1 ? '' : 's'} will be removed from your collection, and any open tabs or Canvas nodes for them will be closed.
            </p>
          </div>
        </div>

        {/* List of selected items */}
        <div className="max-h-40 overflow-y-auto rounded border border-[#232732] bg-[#141720] p-2 space-y-1 text-xs">
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
            type="button"
            onClick={handleDelete}
            isLoading={loading}
            className="text-xs bg-rose-600 hover:bg-rose-500 text-white"
          >
            Delete {count} Request{count === 1 ? '' : 's'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

