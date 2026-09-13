import { create } from 'zustand';

const DEFAULT_STATE = {
  status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
  response: null,
  error: null,
  activeTab: 'body', // 'body' | 'headers' | 'cookies' | 'raw'
  bodyMode: 'pretty', // 'pretty' | 'tree' | 'raw'
  searchQuery: '',
};

export const useResponseStore = create((set, get) => ({
  ...DEFAULT_STATE,

  // Per-request response cache to isolate state between tabs
  responsesByRequest: {},
  activeRequestId: null,

  setActiveRequestId: (requestId) => {
    set((state) => {
      const scoped = requestId ? state.responsesByRequest[requestId] : null;
      return {
        activeRequestId: requestId,
        status: scoped?.status ?? (requestId ? 'idle' : state.status),
        response: scoped?.response ?? (requestId ? null : state.response),
        error: scoped?.error ?? (requestId ? null : state.error),
        activeTab: scoped?.activeTab ?? state.activeTab,
        bodyMode: scoped?.bodyMode ?? state.bodyMode,
        searchQuery: scoped?.searchQuery ?? '',
      };
    });
  },

  getResponseState: (requestId) => {
    const state = get();
    if (requestId && state.responsesByRequest[requestId]) {
      return state.responsesByRequest[requestId];
    }
    return {
      status: state.status,
      response: state.response,
      error: state.error,
      activeTab: state.activeTab,
      bodyMode: state.bodyMode,
      searchQuery: state.searchQuery,
    };
  },

  setLoading: (requestId) => {
    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const updatedMap = targetId
        ? {
            ...state.responsesByRequest,
            [targetId]: {
              ...(state.responsesByRequest[targetId] || DEFAULT_STATE),
              status: 'loading',
              error: null,
            },
          }
        : state.responsesByRequest;

      return {
        status: 'loading',
        error: null,
        responsesByRequest: updatedMap,
      };
    });
  },

  setResponse: (arg1, arg2) => {
    // Overload: setResponse(requestId, response) OR setResponse(response)
    let requestId = null;
    let response = null;

    if (arg2 !== undefined) {
      requestId = arg1;
      response = arg2;
    } else {
      response = arg1;
    }

    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const existing = (targetId && state.responsesByRequest[targetId]) || DEFAULT_STATE;

      const updatedMap = targetId
        ? {
            ...state.responsesByRequest,
            [targetId]: {
              ...existing,
              status: 'success',
              response,
              error: null,
            },
          }
        : state.responsesByRequest;

      return {
        status: 'success',
        response,
        error: null,
        responsesByRequest: updatedMap,
      };
    });
  },

  setError: (arg1, arg2) => {
    // Overload: setError(requestId, error) OR setError(error)
    let requestId = null;
    let error = null;

    if (arg2 !== undefined) {
      requestId = arg1;
      error = arg2;
    } else {
      error = arg1;
    }

    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const existing = (targetId && state.responsesByRequest[targetId]) || DEFAULT_STATE;
      const response = error?.response || null;

      const updatedMap = targetId
        ? {
            ...state.responsesByRequest,
            [targetId]: {
              ...existing,
              status: 'error',
              error,
              response,
            },
          }
        : state.responsesByRequest;

      return {
        status: 'error',
        error,
        response,
        responsesByRequest: updatedMap,
      };
    });
  },

  clearResponse: (requestId) => {
    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const nextMap = { ...state.responsesByRequest };
      if (targetId) {
        delete nextMap[targetId];
      }

      return {
        status: 'idle',
        response: null,
        error: null,
        searchQuery: '',
        responsesByRequest: nextMap,
      };
    });
  },

  setActiveTab: (activeTab, requestId) => {
    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const updatedMap = targetId
        ? {
            ...state.responsesByRequest,
            [targetId]: {
              ...(state.responsesByRequest[targetId] || DEFAULT_STATE),
              activeTab,
            },
          }
        : state.responsesByRequest;

      return {
        activeTab,
        responsesByRequest: updatedMap,
      };
    });
  },

  setBodyMode: (bodyMode, requestId) => {
    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const updatedMap = targetId
        ? {
            ...state.responsesByRequest,
            [targetId]: {
              ...(state.responsesByRequest[targetId] || DEFAULT_STATE),
              bodyMode,
            },
          }
        : state.responsesByRequest;

      return {
        bodyMode,
        responsesByRequest: updatedMap,
      };
    });
  },

  setSearchQuery: (searchQuery, requestId) => {
    set((state) => {
      const targetId = requestId || state.activeRequestId;
      const updatedMap = targetId
        ? {
            ...state.responsesByRequest,
            [targetId]: {
              ...(state.responsesByRequest[targetId] || DEFAULT_STATE),
              searchQuery,
            },
          }
        : state.responsesByRequest;

      return {
        searchQuery,
        responsesByRequest: updatedMap,
      };
    });
  },
}));

export default useResponseStore;
