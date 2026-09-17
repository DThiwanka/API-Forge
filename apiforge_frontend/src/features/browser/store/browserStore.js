import { create } from 'zustand';

export const useBrowserStore = create((set) => ({
  activeSessionId: null,
  activeTabId: null,
  addressBarValue: '',
  isLoading: false,
  error: null,

  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setActiveTabId: (tabId) => set({ activeTabId: tabId }),
  setAddressBarValue: (val) => set({ addressBarValue: val }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      activeSessionId: null,
      activeTabId: null,
      addressBarValue: '',
      isLoading: false,
      error: null,
    }),
}));

export default useBrowserStore;
