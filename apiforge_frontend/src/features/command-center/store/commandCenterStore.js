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
}));

export default useCommandCenterStore;

