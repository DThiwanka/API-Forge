import { create } from 'zustand';

const STORAGE_KEY = 'apiforge:settings';

export const FONT_SIZES = [12, 13, 14, 15, 16, 18];
export const DENSITIES = ['comfortable', 'compact'];
export const THEMES = ['dark', 'system'];
export const RESPONSE_MODES = ['pretty', 'raw'];

const DEFAULT_SETTINGS = {
  theme: 'dark',
  density: 'comfortable',
  reducedMotion: false,
  editorFontSize: 13,
  editorWordWrap: true,
  defaultResponseMode: 'pretty',
  autoFormatOnSave: false,
};

function loadStoredSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota or private browsing errors
  }
}

function applyDomAttributes(state) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (state.density) {
    root.setAttribute('data-density', state.density);
  }
  if (state.reducedMotion) {
    root.setAttribute('data-reduced-motion', 'true');
  } else {
    root.removeAttribute('data-reduced-motion');
  }
}

export const useSettingsStore = create((set, get) => {
  const initial = loadStoredSettings();
  applyDomAttributes(initial);

  return {
    ...initial,

    setTheme: (theme) => {
      if (!THEMES.includes(theme)) return;
      const next = { ...get(), theme };
      set({ theme });
      saveSettings(next);
    },

    setDensity: (density) => {
      if (!DENSITIES.includes(density)) return;
      const next = { ...get(), density };
      set({ density });
      saveSettings(next);
      applyDomAttributes(next);
    },

    setReducedMotion: (reducedMotion) => {
      const next = { ...get(), reducedMotion: Boolean(reducedMotion) };
      set({ reducedMotion: Boolean(reducedMotion) });
      saveSettings(next);
      applyDomAttributes(next);
    },

    setEditorFontSize: (size) => {
      const parsed = Number(size);
      if (!FONT_SIZES.includes(parsed)) return;
      const next = { ...get(), editorFontSize: parsed };
      set({ editorFontSize: parsed });
      saveSettings(next);
    },

    setEditorWordWrap: (wrap) => {
      const next = { ...get(), editorWordWrap: Boolean(wrap) };
      set({ editorWordWrap: Boolean(wrap) });
      saveSettings(next);
    },

    setDefaultResponseMode: (mode) => {
      if (!RESPONSE_MODES.includes(mode)) return;
      const next = { ...get(), defaultResponseMode: mode };
      set({ defaultResponseMode: mode });
      saveSettings(next);
    },

    setAutoFormatOnSave: (val) => {
      const next = { ...get(), autoFormatOnSave: Boolean(val) };
      set({ autoFormatOnSave: Boolean(val) });
      saveSettings(next);
    },

    resetDefaults: () => {
      set(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS);
      applyDomAttributes(DEFAULT_SETTINGS);
    },
  };
});

export default useSettingsStore;
