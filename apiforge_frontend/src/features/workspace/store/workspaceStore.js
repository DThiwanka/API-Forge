import { create } from 'zustand';

export const useWorkspaceStore = create((set) => ({
  activeWorkspaceId: null,
  sidebarCollapsed: false,

  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));

export default useWorkspaceStore;

