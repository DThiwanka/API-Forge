import { create } from 'zustand';

export const useCollectionStore = create((set) => ({
  expandedCollectionIds: {},
  expandedFolderIds: {},
  searchQuery: '',

  toggleCollection: (id) =>
    set((state) => ({
      expandedCollectionIds: {
        ...state.expandedCollectionIds,
        // Default collections to open if not yet explicitly toggled
        [id]: state.expandedCollectionIds[id] === undefined ? false : !state.expandedCollectionIds[id],
      },
    })),

  expandCollection: (id) =>
    set((state) => ({
      expandedCollectionIds: {
        ...state.expandedCollectionIds,
        [id]: true,
      },
    })),

  collapseCollection: (id) =>
    set((state) => ({
      expandedCollectionIds: {
        ...state.expandedCollectionIds,
        [id]: false,
      },
    })),

  toggleFolder: (id) =>
    set((state) => ({
      expandedFolderIds: {
        ...state.expandedFolderIds,
        // Default folders to closed if not yet explicitly toggled
        [id]: !state.expandedFolderIds[id],
      },
    })),

  expandFolder: (id) =>
    set((state) => ({
      expandedFolderIds: {
        ...state.expandedFolderIds,
        [id]: true,
      },
    })),

  collapseFolder: (id) =>
    set((state) => ({
      expandedFolderIds: {
        ...state.expandedFolderIds,
        [id]: false,
      },
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));

export default useCollectionStore;

