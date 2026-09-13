import { create } from 'zustand';

/**
 * requestTabStore manages open request tabs scoped by workspaceId.
 * Guarantees workspace isolation, deterministic tab ordering (append to right),
 * dirty tracking per tab, and intelligent next-tab resolution upon closure.
 */
export const useRequestTabStore = create((set, get) => ({
  tabsByWorkspace: {},
  activeTabByWorkspace: {},
  historyByWorkspace: {},

  getTabs: (workspaceId) => {
    if (!workspaceId) return [];
    return get().tabsByWorkspace[workspaceId] || [];
  },

  getActiveTabId: (workspaceId) => {
    if (!workspaceId) return null;
    return get().activeTabByWorkspace[workspaceId] || null;
  },

  getActiveTab: (workspaceId) => {
    if (!workspaceId) return null;
    const tabs = get().tabsByWorkspace[workspaceId] || [];
    const activeId = get().activeTabByWorkspace[workspaceId];
    return tabs.find((t) => t.requestId === activeId) || null;
  },

  openTab: ({ workspaceId, collectionId, requestId, title = 'Untitled Request', method = 'GET', url = '', isDirty = false }) => {
    if (!workspaceId || !requestId) return;

    set((state) => {
      const currentTabs = state.tabsByWorkspace[workspaceId] || [];
      const currentHistory = state.historyByWorkspace[workspaceId] || [];

      const existingIndex = currentTabs.findIndex((t) => t.requestId === requestId);

      let nextTabs;
      if (existingIndex >= 0) {
        // Tab already open: keep existing tab and optionally update metadata if new title/method/url given
        nextTabs = currentTabs.map((t, idx) => {
          if (idx === existingIndex) {
            return {
              ...t,
              title: title !== 'Untitled Request' && title !== 'Loading...' ? title : t.title,
              method: method || t.method,
              url: url || t.url || '',
              collectionId: collectionId || t.collectionId,
            };
          }
          return t;
        });
      } else {
        // New tab: append to right
        const newTab = {
          requestId,
          collectionId,
          workspaceId,
          title: title || 'Untitled Request',
          method: (method || 'GET').toUpperCase(),
          url: url || '',
          isDirty: Boolean(isDirty),
        };
        nextTabs = [...currentTabs, newTab];
      }

      // Update active tab and history
      const nextHistory = [...currentHistory.filter((id) => id !== requestId), requestId];

      return {
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [workspaceId]: nextTabs,
        },
        activeTabByWorkspace: {
          ...state.activeTabByWorkspace,
          [workspaceId]: requestId,
        },
        historyByWorkspace: {
          ...state.historyByWorkspace,
          [workspaceId]: nextHistory,
        },
      };
    });
  },

  setActiveTab: (workspaceId, requestId) => {
    if (!workspaceId || !requestId) return;

    set((state) => {
      const currentHistory = state.historyByWorkspace[workspaceId] || [];
      const nextHistory = [...currentHistory.filter((id) => id !== requestId), requestId];

      return {
        activeTabByWorkspace: {
          ...state.activeTabByWorkspace,
          [workspaceId]: requestId,
        },
        historyByWorkspace: {
          ...state.historyByWorkspace,
          [workspaceId]: nextHistory,
        },
      };
    });
  },

  closeTab: (workspaceId, requestId) => {
    if (!workspaceId || !requestId) return { nextTab: null, closedTab: null };

    let closedTab = null;
    let nextTab = null;

    set((state) => {
      const currentTabs = state.tabsByWorkspace[workspaceId] || [];
      const currentHistory = state.historyByWorkspace[workspaceId] || [];
      const activeId = state.activeTabByWorkspace[workspaceId];

      const tabIndex = currentTabs.findIndex((t) => t.requestId === requestId);
      if (tabIndex === -1) {
        return state;
      }

      closedTab = currentTabs[tabIndex];
      const remainingTabs = currentTabs.filter((t) => t.requestId !== requestId);
      const remainingHistory = currentHistory.filter((id) => id !== requestId);

      let nextActiveId = activeId;

      // If the closed tab was currently active, choose the next active tab deterministically
      if (activeId === requestId) {
        if (remainingTabs.length === 0) {
          nextActiveId = null;
          nextTab = null;
        } else {
          // 1. Check recent history in reverse for a tab that is still open
          let foundInHistory = null;
          for (let i = remainingHistory.length - 1; i >= 0; i--) {
            const histId = remainingHistory[i];
            const match = remainingTabs.find((t) => t.requestId === histId);
            if (match) {
              foundInHistory = match;
              break;
            }
          }

          if (foundInHistory) {
            nextActiveId = foundInHistory.requestId;
            nextTab = foundInHistory;
          } else {
            // 2. Adjacent tab: adjacent right (same index) or left (tabIndex - 1)
            const fallbackIndex = Math.min(tabIndex, remainingTabs.length - 1);
            nextTab = remainingTabs[fallbackIndex];
            nextActiveId = nextTab.requestId;
          }
        }
      } else {
        // Inactive tab was closed; active tab remains
        nextTab = remainingTabs.find((t) => t.requestId === activeId) || null;
      }

      return {
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [workspaceId]: remainingTabs,
        },
        activeTabByWorkspace: {
          ...state.activeTabByWorkspace,
          [workspaceId]: nextActiveId,
        },
        historyByWorkspace: {
          ...state.historyByWorkspace,
          [workspaceId]: remainingHistory,
        },
      };
    });

    return { nextTab, closedTab };
  },

  closeOtherTabs: (workspaceId, requestId) => {
    if (!workspaceId || !requestId) return [];

    let closedTabs = [];

    set((state) => {
      const currentTabs = state.tabsByWorkspace[workspaceId] || [];
      const keptTab = currentTabs.find((t) => t.requestId === requestId);
      if (!keptTab) return state;

      closedTabs = currentTabs.filter((t) => t.requestId !== requestId);

      return {
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [workspaceId]: [keptTab],
        },
        activeTabByWorkspace: {
          ...state.activeTabByWorkspace,
          [workspaceId]: requestId,
        },
        historyByWorkspace: {
          ...state.historyByWorkspace,
          [workspaceId]: [requestId],
        },
      };
    });

    return closedTabs;
  },

  closeTabsToRight: (workspaceId, requestId) => {
    if (!workspaceId || !requestId) return [];

    let closedTabs = [];

    set((state) => {
      const currentTabs = state.tabsByWorkspace[workspaceId] || [];
      const tabIndex = currentTabs.findIndex((t) => t.requestId === requestId);
      if (tabIndex === -1) return state;

      const keptTabs = currentTabs.slice(0, tabIndex + 1);
      closedTabs = currentTabs.slice(tabIndex + 1);

      const activeId = state.activeTabByWorkspace[workspaceId];
      const activeStillOpen = keptTabs.some((t) => t.requestId === activeId);
      const nextActiveId = activeStillOpen ? activeId : requestId;

      const keptIds = new Set(keptTabs.map((t) => t.requestId));
      const nextHistory = (state.historyByWorkspace[workspaceId] || []).filter((id) => keptIds.has(id));

      return {
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [workspaceId]: keptTabs,
        },
        activeTabByWorkspace: {
          ...state.activeTabByWorkspace,
          [workspaceId]: nextActiveId,
        },
        historyByWorkspace: {
          ...state.historyByWorkspace,
          [workspaceId]: nextHistory,
        },
      };
    });

    return closedTabs;
  },

  setTabDirty: (workspaceId, requestId, isDirty) => {
    if (!workspaceId || !requestId) return;

    set((state) => {
      const currentTabs = state.tabsByWorkspace[workspaceId] || [];
      const updatedTabs = currentTabs.map((t) =>
        t.requestId === requestId ? { ...t, isDirty: Boolean(isDirty) } : t
      );

      return {
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [workspaceId]: updatedTabs,
        },
      };
    });
  },

  updateTabMeta: (workspaceId, requestId, { title, method, url }) => {
    if (!workspaceId || !requestId) return;

    set((state) => {
      const currentTabs = state.tabsByWorkspace[workspaceId] || [];
      const updatedTabs = currentTabs.map((t) => {
        if (t.requestId === requestId) {
          return {
            ...t,
            title: title || t.title,
            method: method ? method.toUpperCase() : t.method,
            url: url !== undefined ? url : t.url,
          };
        }
        return t;
      });

      return {
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [workspaceId]: updatedTabs,
        },
      };
    });
  },

  closeAllTabs: (workspaceId) => {
    get().clearWorkspaceTabs(workspaceId);
  },

  clearWorkspaceTabs: (workspaceId) => {
    if (!workspaceId) return;
    set((state) => ({
      tabsByWorkspace: {
        ...state.tabsByWorkspace,
        [workspaceId]: [],
      },
      activeTabByWorkspace: {
        ...state.activeTabByWorkspace,
        [workspaceId]: null,
      },
      historyByWorkspace: {
        ...state.historyByWorkspace,
        [workspaceId]: [],
      },
    }));
  },
}));

export default useRequestTabStore;

