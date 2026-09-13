import { create } from 'zustand';

export const useCommandCenterStore = create((set) => ({
  isOpen: false,
  query: '',
  activeModal: null, // 'create-request' | 'create-collection' | null
  modalContext: {},

  open: () => set({ isOpen: true, query: '' }),
  close: () => set({ isOpen: false, query: '' }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen, query: state.isOpen ? '' : state.query })),
  setQuery: (query) => set({ query }),

  openCreateRequest: (context = {}) =>
    set({
      isOpen: false,
      query: '',
      activeModal: 'create-request',
      modalContext: context,
    }),

  openCreateCollection: (context = {}) =>
    set({
      isOpen: false,
      query: '',
      activeModal: 'create-collection',
      modalContext: context,
    }),

  closeModal: () => set({ activeModal: null, modalContext: {} }),
  recentCommandIdsByWorkspace: {},

  recordCommandExecution: (workspaceId, commandId) => {
    if (!workspaceId || !commandId) return;
    set((state) => {
      const currentList = state.recentCommandIdsByWorkspace[workspaceId] || [];
      const filtered = currentList.filter((id) => id !== commandId);
      const nextList = [commandId, ...filtered].slice(0, 7); // keep up to 7 recent commands
      return {
        recentCommandIdsByWorkspace: {
          ...state.recentCommandIdsByWorkspace,
          [workspaceId]: nextList,
        },
      };
    });
  },

  clearRecentCommands: (workspaceId) => {
    if (!workspaceId) return;
    set((state) => ({
      recentCommandIdsByWorkspace: {
        ...state.recentCommandIdsByWorkspace,
        [workspaceId]: [],
      },
    }));
  },
}));

export default useCommandCenterStore;

