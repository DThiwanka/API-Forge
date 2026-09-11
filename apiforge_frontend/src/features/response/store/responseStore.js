import { create } from 'zustand';

export const useResponseStore = create((set) => ({
  status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  response: null,
  error: null,
  activeTab: 'body', // 'body' | 'headers' | 'cookies' | 'raw'
  bodyMode: 'pretty', // 'pretty' | 'raw'
  searchQuery: '',

  setLoading: () =>
    set({
      status: 'loading',
      error: null,
    }),

  setResponse: (response) =>
    set({
      status: 'success',
      response,
      error: null,
    }),

  setError: (error) =>
    set({
      status: 'error',
      error,
      // If error contains a response (e.g. from backend execution), we keep it if available
      response: error?.response || null,
    }),

  clearResponse: () =>
    set({
      status: 'idle',
      response: null,
      error: null,
      searchQuery: '',
    }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setBodyMode: (bodyMode) => set({ bodyMode }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));

export default useResponseStore;

