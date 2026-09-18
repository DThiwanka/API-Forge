import { create } from 'zustand';

export const useCollaborationStore = create((set) => ({
  connectionStatus: 'offline', // 'offline' | 'connecting' | 'connected' | 'reconnecting'
  workspacePresence: [],
  remoteUpdateWarnings: {}, // requestId -> { actorName, timestamp }
  deletedResources: {}, // resourceId -> { actorName, timestamp, type }

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setWorkspacePresence: (presence) => set({ workspacePresence: Array.isArray(presence) ? presence : [] }),

  setRemoteUpdateWarning: (requestId, warning) =>
    set((state) => ({
      remoteUpdateWarnings: {
        ...state.remoteUpdateWarnings,
        [requestId]: warning,
      },
    })),

  dismissRemoteUpdateWarning: (requestId) =>
    set((state) => {
      const next = { ...state.remoteUpdateWarnings };
      delete next[requestId];
      return { remoteUpdateWarnings: next };
    }),

  setDeletedResource: (resourceId, data) =>
    set((state) => ({
      deletedResources: {
        ...state.deletedResources,
        [resourceId]: data,
      },
    })),

  dismissDeletedResource: (resourceId) =>
    set((state) => {
      const next = { ...state.deletedResources };
      delete next[resourceId];
      return { deletedResources: next };
    }),

  clearCollaborationState: () =>
    set({
      workspacePresence: [],
      remoteUpdateWarnings: {},
      deletedResources: {},
    }),
}));

export default useCollaborationStore;

