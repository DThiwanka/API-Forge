import { create } from 'zustand';

export const useCollectionStore = create((set) => ({
  expandedCollectionIds: {},
  expandedFolderIds: {},
  searchQuery: '',
  selectedRequests: {},
  selectedMethodFilter: 'ALL',

  toggleRequestSelected: (request, collectionId) =>
    set((state) => {
      const next = { ...state.selectedRequests };
      if (next[request.id]) {
        delete next[request.id];
      } else {
        next[request.id] = {
          id: request.id,
          collectionId: collectionId || request.collectionId,
          folderId: request.folderId || null,
          name: request.name || 'Untitled',
          method: request.method || 'GET',
          url: request.url || '',
        };
      }
      return { selectedRequests: next };
    }),

  selectMultipleRequests: (requestsList = []) =>
    set((state) => {
      const next = { ...state.selectedRequests };
      for (const item of requestsList) {
        if (item && item.id) {
          next[item.id] = {
            id: item.id,
            collectionId: item.collectionId,
            folderId: item.folderId || null,
            name: item.name || 'Untitled',
            method: item.method || 'GET',
            url: item.url || '',
          };
        }
      }
      return { selectedRequests: next };
    }),

  selectAllVisibleRequests: (requestsList = []) =>
    set(() => {
      const next = {};
      for (const item of requestsList) {
        if (item && item.id) {
          next[item.id] = {
            id: item.id,
            collectionId: item.collectionId,
            folderId: item.folderId || null,
            name: item.name || 'Untitled',
            method: item.method || 'GET',
            url: item.url || '',
          };
        }
      }
      return { selectedRequests: next };
    }),

  clearSelection: () => set({ selectedRequests: {} }),

  setSelectedMethodFilter: (method) => set({ selectedMethodFilter: method || 'ALL' }),

  resetWorkspaceState: () =>
    set({
      selectedRequests: {},
      selectedMethodFilter: 'ALL',
      searchQuery: '',
    }),

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

  expandAll: (collectionIds = [], folderIds = []) =>
    set((state) => {
      const nextCols = { ...state.expandedCollectionIds };
      for (const id of collectionIds) {
        nextCols[id] = true;
      }
      const nextFolders = { ...state.expandedFolderIds };
      for (const id of folderIds) {
        nextFolders[id] = true;
      }
      return { expandedCollectionIds: nextCols, expandedFolderIds: nextFolders };
    }),

  collapseAll: (collectionIds = []) =>
    set(() => {
      const nextCols = {};
      for (const id of collectionIds) {
        nextCols[id] = false;
      }
      return { expandedCollectionIds: nextCols, expandedFolderIds: {} };
    }),

  revealAncestors: (collectionId, ancestorFolderIds = []) =>
    set((state) => {
      const nextCols = { ...state.expandedCollectionIds, [collectionId]: true };
      const nextFolders = { ...state.expandedFolderIds };
      for (const fId of ancestorFolderIds) {
        nextFolders[fId] = true;
      }
      return { expandedCollectionIds: nextCols, expandedFolderIds: nextFolders };
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  clearSearch: () => set({ searchQuery: '' }),
}));

export default useCollectionStore;

