import { create } from 'zustand';

export const useBrowserStore = create((set) => ({
  activeSessionId: null,
  activeTabId: null,
  addressBarValue: '',
  isLoading: false,
  error: null,

  // Network Activity (Step 51)
  isNetworkPanelOpen: true,
  isCapturing: true,
  networkFilter: 'all', // 'all' | 'fetch' | 'doc' | 'assets' | 'errors'
  networkSearch: '',
  selectedEventId: null,

  setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),
  setActiveTabId: (tabId) => set({ activeTabId: tabId }),
  setAddressBarValue: (val) => set({ addressBarValue: val }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Network actions
  toggleNetworkPanel: () => set((state) => ({ isNetworkPanelOpen: !state.isNetworkPanelOpen })),
  setIsNetworkPanelOpen: (isNetworkPanelOpen) => set({ isNetworkPanelOpen }),
  toggleCapturing: () => set((state) => ({ isCapturing: !state.isCapturing })),
  setIsCapturing: (isCapturing) => set({ isCapturing }),
  setNetworkFilter: (networkFilter) => set({ networkFilter }),
  setNetworkSearch: (networkSearch) => set({ networkSearch }),
  setSelectedEventId: (selectedEventId) => set({ selectedEventId }),
  clearSelectedEvent: () => set({ selectedEventId: null }),

  reset: () =>
    set({
      activeSessionId: null,
      activeTabId: null,
      addressBarValue: '',
      isLoading: false,
      error: null,
      isNetworkPanelOpen: true,
      isCapturing: true,
      networkFilter: 'all',
      networkSearch: '',
      selectedEventId: null,
    }),
}));

export default useBrowserStore;
