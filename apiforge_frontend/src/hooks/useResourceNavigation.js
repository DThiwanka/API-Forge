import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useRequestTabStore from '../features/requests/store/requestTabStore';
import useCanvasStore from '../features/canvas/store/canvasStore';
import useCollectionStore from '../features/collections/store/collectionStore';
import { toast } from '../stores/toastStore';

/**
 * useResourceNavigation provides unified navigation primitives across:
 * - Request Workspace Tabs
 * - Spatial API Canvas
 * - Collection / Folder Resource Tree
 */
export function useResourceNavigation(workspaceId) {
  const navigate = useNavigate();

  /**
   * Open or switch to a request in Request Workspace
   * Ensures tab exists, activates it, and routes appropriately without duplicating.
   */
  const openRequest = useCallback(
    (requestId, { collectionId, folderId, title, method, url, preserveCanvas = false } = {}) => {
      if (!workspaceId || !requestId) return;

      // 1. Open or focus existing tab in RequestTabStore
      useRequestTabStore.getState().openTab({
        workspaceId,
        collectionId,
        folderId,
        requestId,
        title: title || 'Untitled Request',
        method: method || 'GET',
        url: url || '',
      });

      // 2. If requested to preserve canvas, focus node if it exists
      if (preserveCanvas) {
        const node = useCanvasStore.getState().nodes.find((n) => n.id === requestId);
        if (node) {
          useCanvasStore.getState().setSelectedNodeId(requestId);
          useCanvasStore.getState().setFocusNodeId(requestId);
        }
        return;
      }

      // 3. Navigate to Request Workspace route
      if (collectionId) {
        navigate(`/workspace/${workspaceId}/collections/${collectionId}/requests/${requestId}`);
      } else {
        navigate(`/workspace/${workspaceId}`);
      }
    },
    [workspaceId, navigate]
  );

  /**
   * Reveal and expand a request in the Collection Tree
   */
  const revealInCollection = useCallback(
    (requestId, { collectionId, folderIds = [] } = {}) => {
      if (!collectionId) return;

      // Expand collection and all ancestor folders
      useCollectionStore.getState().revealAncestors(collectionId, folderIds);

      // Trigger auto-scroll / DOM focus by signaling data attribute
      setTimeout(() => {
        const itemEl = document.querySelector(`[data-request-id="${requestId}"]`);
        if (itemEl) {
          itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          itemEl.classList.add('ring-2', 'ring-sky-400');
          setTimeout(() => {
            itemEl.classList.remove('ring-2', 'ring-sky-400');
          }, 1500);
        }
      }, 80);
    },
    []
  );

  /**
   * Open or locate a request on the Spatial API Canvas
   */
  const openInCanvas = useCallback(
    (requestId, { collectionId, request, collectionName = 'Collection', folderName = null } = {}) => {
      if (!workspaceId || !requestId) return;

      const canvasStore = useCanvasStore.getState();
      const existingNode = canvasStore.nodes.find((n) => n.id === requestId);

      if (existingNode) {
        canvasStore.setSelectedNodeId(requestId);
        canvasStore.setFocusNodeId(requestId);
        toast.info(`Focused "${existingNode.data?.name || 'Request'}" on Canvas`);
      } else {
        // Add request to canvas
        const reqData = request || {
          id: requestId,
          collectionId,
          name: 'Untitled Request',
          method: 'GET',
          url: '',
        };
        canvasStore.addRequestNode(reqData, collectionName, folderName);
        toast.success(`Added "${reqData.name || 'Request'}" to Canvas`);
      }

      // Navigate to canvas route
      navigate(`/workspace/${workspaceId}/canvas`);
    },
    [workspaceId, navigate]
  );

  /**
   * Batch open requests into Request Workspace tabs
   */
  const batchOpenRequests = useCallback(
    (requests = []) => {
      if (!workspaceId || !Array.isArray(requests) || requests.length === 0) return 0;

      let count = 0;
      requests.forEach((req) => {
        if (req.id && req.collectionId) {
          useRequestTabStore.getState().openTab({
            workspaceId,
            collectionId: req.collectionId,
            requestId: req.id,
            title: req.name || 'Untitled Request',
            method: req.method || 'GET',
            url: req.url || '',
          });
          count++;
        }
      });

      return count;
    },
    [workspaceId]
  );

  return {
    openRequest,
    revealInCollection,
    openInCanvas,
    batchOpenRequests,
  };
}

export default useResourceNavigation;
