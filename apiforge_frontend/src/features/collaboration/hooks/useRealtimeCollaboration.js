import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import wsClient from '../../../lib/websocket';
import useCollaborationStore from '../store/collaborationStore';
import useRequestStore from '../../requests/store/requestStore';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { toast } from '../../../stores/toastStore';

export function useRealtimeCollaboration(workspaceId) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const setConnectionStatus = useCollaborationStore((s) => s.setConnectionStatus);
  const setWorkspacePresence = useCollaborationStore((s) => s.setWorkspacePresence);
  const setRemoteUpdateWarning = useCollaborationStore((s) => s.setRemoteUpdateWarning);
  const setDeletedResource = useCollaborationStore((s) => s.setDeletedResource);
  const clearCollaborationState = useCollaborationStore((s) => s.clearCollaborationState);

  useEffect(() => {
    if (!currentUser) {
      wsClient.disconnect();
      return;
    }

    // Connect WebSocket
    wsClient.connect();

    // Listen for connection status changes
    const unsubStatus = wsClient.onStatusChange((status) => {
      setConnectionStatus(status);
    });

    return () => {
      unsubStatus();
    };
  }, [currentUser, setConnectionStatus]);

  // Handle workspace switching & event subscription
  useEffect(() => {
    if (!workspaceId || !currentUser) {
      clearCollaborationState();
      return;
    }

    // Subscribe to current workspace
    wsClient.subscribeWorkspace(workspaceId);

    // 1. Presence events
    const unsubPresence = wsClient.on('workspace.presence', (event) => {
      if (event.workspaceId === workspaceId) {
        setWorkspacePresence(event.presence);
      }
    });

    // 2. Request events
    const unsubReqCreated = wsClient.on('request.created', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] });
      }
    });

    const unsubReqUpdated = wsClient.on('request.updated', (event) => {
      if (event.workspaceId !== workspaceId) return;

      const reqState = useRequestStore.getState();
      const isCurrentRequest = reqState.id === event.resourceId;
      const isDirty = reqState.isDirty || Boolean(reqState.drafts[event.resourceId]);

      if (isCurrentRequest && isDirty) {
        // Protect unsaved local draft! Do NOT silently overwrite
        setRemoteUpdateWarning(event.resourceId, {
          actorName: event.actor?.displayName || 'A teammate',
          timestamp: event.timestamp,
        });
      } else {
        // Safe to invalidate server query
        if (event.metadata?.collectionId) {
          queryClient.invalidateQueries({
            queryKey: ['request', workspaceId, event.metadata.collectionId, event.resourceId],
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] });
    });

    const unsubReqDeleted = wsClient.on('request.deleted', (event) => {
      if (event.workspaceId !== workspaceId) return;

      const reqState = useRequestStore.getState();
      if (reqState.id === event.resourceId) {
        setDeletedResource(event.resourceId, {
          actorName: event.actor?.displayName || 'A teammate',
          type: 'request',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['requests', workspaceId] });
    });

    // 3. Collection & Folder events
    const unsubColCreated = wsClient.on('collection.created', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
      }
    });

    const unsubColUpdated = wsClient.on('collection.updated', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
      }
    });

    const unsubColDeleted = wsClient.on('collection.deleted', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['collections', workspaceId] });
      }
    });

    const unsubFolderCreated = wsClient.on('folder.created', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] });
      }
    });

    const unsubFolderUpdated = wsClient.on('folder.updated', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] });
      }
    });

    const unsubFolderDeleted = wsClient.on('folder.deleted', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['folders', workspaceId] });
      }
    });

    // 4. Environment events
    const unsubEnvEvents = wsClient.on('*', (event) => {
      if (
        event.workspaceId === workspaceId &&
        ['environment.created', 'environment.updated', 'environment.deleted', 'environment.activated'].includes(
          event.type
        )
      ) {
        queryClient.invalidateQueries({ queryKey: ['environments', workspaceId] });
      }
    });

    // 5. Member & Permission events
    const unsubMemberUpdated = wsClient.on('member.updated', (event) => {
      if (event.workspaceId === workspaceId) {
        if (event.metadata?.userId === currentUser?.id) {
          toast.warning('Your workspace permissions have changed.');
        }
        queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      }
    });

    const unsubMemberRemoved = wsClient.on('member.removed', (event) => {
      if (event.workspaceId === workspaceId) {
        if (event.metadata?.userId === currentUser?.id) {
          toast.error('Your access to this workspace has been removed.');
          wsClient.unsubscribeWorkspace(workspaceId);
          clearCollaborationState();
          navigate('/workspace', { replace: true });
        } else {
          queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
        }
      }
    });

    const unsubMemberAdded = wsClient.on('member.added', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      }
    });

    const unsubInviteCreated = wsClient.on('invitation.created', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      }
    });

    const unsubInviteRevoked = wsClient.on('invitation.revoked', (event) => {
      if (event.workspaceId === workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] });
      }
    });

    return () => {
      wsClient.unsubscribeWorkspace(workspaceId);
      clearCollaborationState();
      unsubPresence();
      unsubReqCreated();
      unsubReqUpdated();
      unsubReqDeleted();
      unsubColCreated();
      unsubColUpdated();
      unsubColDeleted();
      unsubFolderCreated();
      unsubFolderUpdated();
      unsubFolderDeleted();
      unsubEnvEvents();
      unsubMemberUpdated();
      unsubMemberRemoved();
      unsubMemberAdded();
      unsubInviteCreated();
      unsubInviteRevoked();
    };
  }, [
    workspaceId,
    currentUser,
    queryClient,
    navigate,
    setWorkspacePresence,
    setRemoteUpdateWarning,
    setDeletedResource,
    clearCollaborationState,
  ]);
}

export default useRealtimeCollaboration;

