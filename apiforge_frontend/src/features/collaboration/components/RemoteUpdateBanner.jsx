import { memo } from 'react';
import { AlertTriangle, Trash2, RefreshCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import useCollaborationStore from '../store/collaborationStore';
import useRequestStore from '../../requests/store/requestStore';
import useRequestTabStore from '../../requests/store/requestTabStore';
import { getRequest } from '../../requests/services/requestApi';

function RemoteUpdateBannerComponent({ workspaceId, collectionId, requestId }) {
  const queryClient = useQueryClient();
  const warning = useCollaborationStore((s) => s.remoteUpdateWarnings[requestId]);
  const deletedInfo = useCollaborationStore((s) => s.deletedResources[requestId]);
  const dismissWarning = useCollaborationStore((s) => s.dismissRemoteUpdateWarning);
  const dismissDeleted = useCollaborationStore((s) => s.dismissDeletedResource);

  const loadRequest = useRequestStore((s) => s.loadRequest);
  const clearDraft = useRequestStore((s) => s.clearDraft);
  const closeTab = useRequestTabStore((s) => s.closeTab);

  if (!requestId) return null;

  // 1. Resource Deletion Notification
  if (deletedInfo) {
    const handleClose = () => {
      dismissDeleted(requestId);
      if (workspaceId) {
        closeTab(workspaceId, requestId);
      }
    };

    return (
      <div className="bg-rose-950/70 border-b border-rose-800/60 px-4 py-2 flex items-center justify-between gap-3 text-xs text-rose-200 animate-in fade-in duration-100">
        <div className="flex items-center gap-2">
          <Trash2 size={14} className="text-rose-400 shrink-0" />
          <span>
            This request was deleted by <strong className="text-white">{deletedInfo.actorName}</strong>.
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-medium transition-colors cursor-pointer"
        >
          Close Tab
        </button>
      </div>
    );
  }

  // 2. Unsaved Changes Conflict Warning
  if (warning) {
    const handleReload = async () => {
      dismissWarning(requestId);
      clearDraft(requestId);
      if (workspaceId && collectionId && requestId) {
        try {
          const freshData = await getRequest(workspaceId, collectionId, requestId);
          loadRequest(freshData, workspaceId, collectionId);
          queryClient.setQueryData(['request', workspaceId, collectionId, requestId], freshData);
        } catch {
          // ignore
        }
      }
    };

    const handleKeep = () => {
      dismissWarning(requestId);
    };

    return (
      <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in duration-100">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span>
            This request was updated by <strong className="text-white">{warning.actorName}</strong>. Your local changes haven't been saved.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-100 text-[11px] font-medium transition-colors cursor-pointer"
            title="Discard local changes and load server version"
          >
            <RefreshCw size={11} />
            <span>Load Server Version</span>
          </button>
          <button
            type="button"
            onClick={handleKeep}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2330] hover:bg-[#282f42] text-slate-300 hover:text-white text-[11px] transition-colors cursor-pointer"
            title="Keep my current edits"
          >
            <X size={11} />
            <span>Keep My Changes</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export const RemoteUpdateBanner = memo(RemoteUpdateBannerComponent);
export default RemoteUpdateBanner;

