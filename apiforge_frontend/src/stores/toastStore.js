import { create } from 'zustand';

/**
 * Sensible default durations per notification severity (in milliseconds)
 */
export const TOAST_DURATIONS = {
  success: 2500,
  info: 3500,
  warning: 5000,
  error: 7000,
};

// Deduplication window in milliseconds
const DEDUPE_WINDOW_MS = 3000;

export const useToastStore = create((set, get) => ({
  toasts: [],
  recentToasts: new Map(),

  /**
   * Add a toast notification with optional deduplication and configurable actions
   */
  addToast: (messageOrOptions, defaultType = 'info', customDuration) => {
    let message;
    let title = null;
    let type = defaultType;
    let action = null;
    let dismissible = true;
    let duration = customDuration;

    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      message = messageOrOptions.message || '';
      title = messageOrOptions.title || null;
      type = messageOrOptions.type || defaultType;
      action = messageOrOptions.action || null;
      dismissible = messageOrOptions.dismissible !== false;
      if (typeof messageOrOptions.duration === 'number') {
        duration = messageOrOptions.duration;
      }
    } else {
      message = String(messageOrOptions || '');
    }

    if (!message && !title) {
      return null;
    }

    if (typeof duration !== 'number') {
      duration = TOAST_DURATIONS[type] ?? 3500;
    }

    const dedupeKey = `${type}:${title || ''}:${message}`;
    const now = Date.now();
    const recentMap = get().recentToasts;
    const lastSeen = recentMap.get(dedupeKey);

    if (lastSeen && now - lastSeen < DEDUPE_WINDOW_MS) {
      recentMap.set(dedupeKey, now);
      return null;
    }
    recentMap.set(dedupeKey, now);

    if (recentMap.size > 50) {
      for (const [key, ts] of recentMap.entries()) {
        if (now - ts > DEDUPE_WINDOW_MS * 2) {
          recentMap.delete(key);
        }
      }
    }

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = {
      id,
      type,
      title,
      message,
      action,
      dismissible,
      duration,
      timestamp: now,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
      recentToasts: recentMap,
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clear: () => set({ toasts: [] }),
}));

export const toast = {
  success: (msg, options = {}) =>
    useToastStore.getState().addToast(
      typeof msg === 'object' ? { type: 'success', ...msg } : { message: msg, type: 'success', ...options },
      'success'
    ),
  info: (msg, options = {}) =>
    useToastStore.getState().addToast(
      typeof msg === 'object' ? { type: 'info', ...msg } : { message: msg, type: 'info', ...options },
      'info'
    ),
  warning: (msg, options = {}) =>
    useToastStore.getState().addToast(
      typeof msg === 'object' ? { type: 'warning', ...msg } : { message: msg, type: 'warning', ...options },
      'warning'
    ),
  error: (msg, options = {}) =>
    useToastStore.getState().addToast(
      typeof msg === 'object' ? { type: 'error', ...msg } : { message: msg, type: 'error', ...options },
      'error'
    ),
  dismiss: (id) => useToastStore.getState().dismiss(id),
  clear: () => useToastStore.getState().clear(),
};

export default useToastStore;
