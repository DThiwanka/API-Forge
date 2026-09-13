import { create } from 'zustand';
import useRequestTabStore from './requestTabStore.js';
import { mergeUrlAndQueryParams, syncUrlToQueryParams } from '../utils/urlUtils.js';

function normalizeArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return [{ key: '', value: '', enabled: true, description: '' }];
  }
  return arr.map((item) => ({
    key: item.key ?? '',
    value: item.value ?? '',
    enabled: item.enabled !== false,
    description: item.description ?? '',
  }));
}

function normalizeAuth(auth) {
  const base = {
    type: 'none',
    bearer: { token: '' },
    basic: { username: '', password: '' },
    apiKey: { key: '', value: '', addTo: 'header' },
  };

  if (!auth || typeof auth !== 'object') return base;

  return {
    type: auth.type || 'none',
    bearer: {
      token: auth.bearer?.token ?? auth.token ?? '',
    },
    basic: {
      username: auth.basic?.username ?? auth.username ?? '',
      password: auth.basic?.password ?? auth.password ?? '',
    },
    apiKey: {
      key: auth.apiKey?.key ?? auth.key ?? '',
      value: auth.apiKey?.value ?? auth.value ?? '',
      addTo: auth.apiKey?.addTo ?? auth.addTo ?? 'header',
    },
  };
}

function normalizeBody(body) {
  const base = {
    mode: 'none',
    raw: '',
    urlencoded: [{ key: '', value: '', enabled: true, description: '' }],
  };

  if (!body || typeof body !== 'object') return base;

  return {
    mode: body.mode || 'none',
    raw: typeof body.raw === 'string' ? body.raw : (body.raw ? JSON.stringify(body.raw, null, 2) : ''),
    urlencoded: normalizeArray(body.urlencoded),
  };
}

function normalizeSettings(settings) {
  const extract = Array.isArray(settings?.extract)
    ? settings.extract
    : Array.isArray(settings?.extractions)
    ? settings.extractions
    : [];

  return {
    timeout: typeof settings?.timeout === 'number' ? settings.timeout : 30000,
    followRedirects: settings?.followRedirects !== false,
    extract,
  };
}

export const useRequestStore = create((set, get) => ({
  id: null,
  workspaceId: null,
  collectionId: null,
  folderId: null,
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  queryParams: [{ key: '', value: '', enabled: true, description: '' }],
  headers: [{ key: '', value: '', enabled: true, description: '' }],
  auth: {
    type: 'none',
    bearer: { token: '' },
    basic: { username: '', password: '' },
    apiKey: { key: '', value: '', addTo: 'header' },
  },
  body: {
    mode: 'none',
    raw: '',
    urlencoded: [{ key: '', value: '', enabled: true, description: '' }],
  },
  settings: {
    timeout: 30000,
    followRedirects: true,
    extract: [],
  },
  isDirty: false,
  isSaving: false,
  isExecuting: false,
  activeTab: 'params', // 'params' | 'headers' | 'auth' | 'body' | 'settings'

  // Per-request draft storage to preserve edits across tab switches
  drafts: {},

  // Helper to notify requestTabStore of dirty status
  notifyDirty: () => {
    const state = get();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().setTabDirty(state.workspaceId, state.id, true);
    }
  },

  loadRequest: (request, workspaceId, collectionId) => {
    if (!request) return;
    const current = get();
    const drafts = { ...current.drafts };

    const targetWId = workspaceId || request.workspaceId;
    const targetCId = collectionId || request.collectionId;

    // 1. If currently displaying a different request that has unsaved changes, snapshot it into drafts
    if (current.id && current.id !== request.id && current.isDirty) {
      drafts[current.id] = {
        name: current.name,
        method: current.method,
        url: current.url,
        queryParams: current.queryParams,
        headers: current.headers,
        auth: current.auth,
        body: current.body,
        settings: current.settings,
        activeTab: current.activeTab,
        isDirty: true,
      };
    }

    // 2. If the incoming request has a saved draft, restore it
    const draft = drafts[request.id];
    if (draft) {
      set({
        id: request.id,
        workspaceId: targetWId,
        collectionId: targetCId,
        folderId: request.folderId || null,
        name: draft.name,
        method: draft.method,
        url: draft.url,
        queryParams: draft.queryParams,
        headers: draft.headers,
        auth: draft.auth,
        body: draft.body,
        settings: draft.settings,
        activeTab: draft.activeTab || 'params',
        isDirty: true,
        isSaving: false,
        isExecuting: false,
        drafts,
      });

      if (targetWId) {
        useRequestTabStore.getState().setTabDirty(targetWId, request.id, true);
        useRequestTabStore.getState().updateTabMeta(targetWId, request.id, {
          title: draft.name,
          method: draft.method,
          url: draft.url,
        });
      }
      return;
    }

    // 3. Otherwise, load fresh request data from backend
    const settingsInput = request.settings || (request.extract ? { extract: request.extract } : {});
    if (request.settings && !request.settings.extract && request.extract) {
      settingsInput.extract = request.extract;
    }
    let initialQueryParams = normalizeArray(request.queryParams);
    const hasParams = initialQueryParams.some((p) => p.key?.trim() || p.value?.trim());
    if (!hasParams && request.url && request.url.includes('?')) {
      const fromUrl = syncUrlToQueryParams(request.url);
      if (fromUrl.some((p) => p.key?.trim() || p.value?.trim())) {
        initialQueryParams = fromUrl;
      }
    }

    set({
      id: request.id,
      workspaceId: targetWId,
      collectionId: targetCId,
      folderId: request.folderId || null,
      name: request.name || 'Untitled Request',
      method: (request.method || 'GET').toUpperCase(),
      url: request.url || '',
      queryParams: initialQueryParams,
      headers: normalizeArray(request.headers),
      auth: normalizeAuth(request.auth),
      body: normalizeBody(request.body),
      settings: normalizeSettings(settingsInput),
      isDirty: false,
      isSaving: false,
      isExecuting: false,
      drafts,
    });

    if (targetWId) {
      useRequestTabStore.getState().updateTabMeta(targetWId, request.id, {
        title: request.name,
        method: request.method,
        url: request.url,
      });
    }
  },

  clearDraft: (requestId) => {
    set((state) => {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[requestId];
      const isCurrent = state.id === requestId;
      return {
        drafts: nextDrafts,
        ...(isCurrent ? { isDirty: false } : {}),
      };
    });

    const state = get();
    if (state.workspaceId) {
      useRequestTabStore.getState().setTabDirty(state.workspaceId, requestId, false);
    }
  },

  setName: (name) => {
    set({ name, isDirty: true });
    get().notifyDirty();
    const state = get();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { title: name });
    }
  },

  setMethod: (method) => {
    const upper = method.toUpperCase();
    set({ method: upper, isDirty: true });
    get().notifyDirty();
    const state = get();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { method: upper });
    }
  },

  setUrl: (url, syncQueryParams = true) => {
    const state = get();
    const updates = { url, isDirty: true };
    if (syncQueryParams) {
      updates.queryParams = syncUrlToQueryParams(url, state.queryParams);
    }
    set(updates);
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url });
    }
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setIsExecuting: (isExecuting) => set({ isExecuting }),

  // Query Params
  setQueryParams: (queryParams) => {
    const state = get();
    const nextUrl = mergeUrlAndQueryParams(state.url, queryParams);
    set({ queryParams, url: nextUrl, isDirty: true });
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url: nextUrl });
    }
  },

  updateQueryParam: (index, field, value) => {
    const state = get();
    const list = [...state.queryParams];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    // Auto-append row if typing on the last empty row
    if (index === list.length - 1 && (list[index].key || list[index].value)) {
      list.push({ key: '', value: '', enabled: true, description: '' });
    }
    const nextUrl = mergeUrlAndQueryParams(state.url, list);
    set({ queryParams: list, url: nextUrl, isDirty: true });
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url: nextUrl });
    }
  },

  addQueryParam: () => {
    set((state) => ({
      queryParams: [...state.queryParams, { key: '', value: '', enabled: true, description: '' }],
      isDirty: true,
    }));
    get().notifyDirty();
  },

  duplicateQueryParam: (index) => {
    const state = get();
    const list = [...state.queryParams];
    if (!list[index]) return;
    const clone = { ...list[index] };
    list.splice(index + 1, 0, clone);
    const nextUrl = mergeUrlAndQueryParams(state.url, list);
    set({ queryParams: list, url: nextUrl, isDirty: true });
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url: nextUrl });
    }
  },

  removeQueryParam: (index) => {
    const state = get();
    let next = state.queryParams.filter((_, i) => i !== index);
    if (next.length === 0) {
      next = [{ key: '', value: '', enabled: true, description: '' }];
    }
    const nextUrl = mergeUrlAndQueryParams(state.url, next);
    set({ queryParams: next, url: nextUrl, isDirty: true });
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url: nextUrl });
    }
  },

  enableAllQueryParams: (enabled = true) => {
    const state = get();
    const list = state.queryParams.map((p) => ({ ...p, enabled: Boolean(enabled) }));
    const nextUrl = mergeUrlAndQueryParams(state.url, list);
    set({ queryParams: list, url: nextUrl, isDirty: true });
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url: nextUrl });
    }
  },

  clearAllQueryParams: () => {
    const state = get();
    const list = [{ key: '', value: '', enabled: true, description: '' }];
    const nextUrl = mergeUrlAndQueryParams(state.url, list);
    set({ queryParams: list, url: nextUrl, isDirty: true });
    get().notifyDirty();
    if (state.workspaceId && state.id) {
      useRequestTabStore.getState().updateTabMeta(state.workspaceId, state.id, { url: nextUrl });
    }
  },

  // Headers
  setHeaders: (headers) => {
    set({ headers, isDirty: true });
    get().notifyDirty();
  },

  updateHeader: (index, field, value) => {
    const list = [...get().headers];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    // Auto-append row if typing on the last empty row
    if (index === list.length - 1 && (list[index].key || list[index].value)) {
      list.push({ key: '', value: '', enabled: true, description: '' });
    }
    set({ headers: list, isDirty: true });
    get().notifyDirty();
  },

  addHeader: () => {
    set((state) => ({
      headers: [...state.headers, { key: '', value: '', enabled: true, description: '' }],
      isDirty: true,
    }));
    get().notifyDirty();
  },

  duplicateHeader: (index) => {
    const state = get();
    const list = [...state.headers];
    if (!list[index]) return;
    const clone = { ...list[index] };
    list.splice(index + 1, 0, clone);
    set({ headers: list, isDirty: true });
    get().notifyDirty();
  },

  removeHeader: (index) => {
    set((state) => {
      let next = state.headers.filter((_, i) => i !== index);
      if (next.length === 0) {
        next = [{ key: '', value: '', enabled: true, description: '' }];
      }
      return { headers: next, isDirty: true };
    });
    get().notifyDirty();
  },

  enableAllHeaders: (enabled = true) => {
    set((state) => ({
      headers: state.headers.map((h) => ({ ...h, enabled: Boolean(enabled) })),
      isDirty: true,
    }));
    get().notifyDirty();
  },

  clearAllHeaders: () => {
    set({
      headers: [{ key: '', value: '', enabled: true, description: '' }],
      isDirty: true,
    });
    get().notifyDirty();
  },

  setHeaderKeyValue: (key, value) => {
    const state = get();
    const list = [...state.headers];
    const targetKey = key.trim().toLowerCase();
    const existingIndex = list.findIndex(
      (h) => (h.key || '').trim().toLowerCase() === targetKey
    );

    if (existingIndex !== -1) {
      list[existingIndex] = {
        ...list[existingIndex],
        value,
        enabled: true,
      };
    } else {
      // If last row is empty, replace it, otherwise append
      const last = list[list.length - 1];
      if (last && !last.key?.trim() && !last.value?.trim()) {
        list[list.length - 1] = { key, value, enabled: true, description: '' };
        list.push({ key: '', value: '', enabled: true, description: '' });
      } else {
        list.push({ key, value, enabled: true, description: '' });
      }
    }

    set({ headers: list, isDirty: true });
    get().notifyDirty();
  },

  // Auth
  setAuth: (auth) => {
    set({ auth: normalizeAuth(auth), isDirty: true });
    get().notifyDirty();
  },

  setAuthType: (type) => {
    set((state) => ({
      auth: { ...state.auth, type },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  updateAuthBearer: (field, value) => {
    set((state) => ({
      auth: {
        ...state.auth,
        bearer: { ...state.auth.bearer, [field]: value },
      },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  updateAuthBasic: (field, value) => {
    set((state) => ({
      auth: {
        ...state.auth,
        basic: { ...state.auth.basic, [field]: value },
      },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  updateAuthApiKey: (field, value) => {
    set((state) => ({
      auth: {
        ...state.auth,
        apiKey: { ...state.auth.apiKey, [field]: value },
      },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  // Body
  setBody: (body) => {
    set({ body: normalizeBody(body), isDirty: true });
    get().notifyDirty();
  },

  setBodyMode: (mode) => {
    set((state) => ({
      body: { ...state.body, mode },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  setBodyRaw: (raw) => {
    set((state) => ({
      body: { ...state.body, raw },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  updateBodyUrlEncoded: (index, field, value) => {
    let list = [...(get().body.urlencoded || [])];
    if (!list[index]) {
      if (index === 0 && list.length === 0) {
        list = [{ key: '', value: '', enabled: true, description: '' }];
      } else {
        return;
      }
    }
    list[index] = { ...list[index], [field]: value };
    if (index === list.length - 1 && (list[index].key || list[index].value)) {
      list.push({ key: '', value: '', enabled: true, description: '' });
    }
    set((state) => ({
      body: { ...state.body, urlencoded: list },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  addBodyUrlEncoded: () => {
    set((state) => ({
      body: {
        ...state.body,
        urlencoded: [
          ...state.body.urlencoded,
          { key: '', value: '', enabled: true, description: '' },
        ],
      },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  duplicateBodyUrlEncoded: (index) => {
    const state = get();
    const list = [...state.body.urlencoded];
    if (!list[index]) return;
    const clone = { ...list[index] };
    list.splice(index + 1, 0, clone);
    set({
      body: { ...state.body, urlencoded: list },
      isDirty: true,
    });
    get().notifyDirty();
  },

  removeBodyUrlEncoded: (index) => {
    set((state) => {
      let next = state.body.urlencoded.filter((_, i) => i !== index);
      if (next.length === 0) {
        next = [{ key: '', value: '', enabled: true, description: '' }];
      }
      return {
        body: { ...state.body, urlencoded: next },
        isDirty: true,
      };
    });
    get().notifyDirty();
  },

  // Settings
  setSettings: (settings) => {
    set({ settings: normalizeSettings(settings), isDirty: true });
    get().notifyDirty();
  },

  updateSetting: (field, value) => {
    set((state) => ({
      settings: { ...state.settings, [field]: value },
      isDirty: true,
    }));
    get().notifyDirty();
  },

  markClean: () => {
    const state = get();
    const nextDrafts = { ...state.drafts };
    if (state.id) {
      delete nextDrafts[state.id];
      if (state.workspaceId) {
        useRequestTabStore.getState().setTabDirty(state.workspaceId, state.id, false);
      }
    }
    set({ isDirty: false, drafts: nextDrafts });
  },

  // Serialize payload for saving to API
  getCleanPayload: () => {
    const state = get();
    // Filter out completely blank rows from queryParams and headers
    const queryParams = state.queryParams
      .filter((p) => p.key?.trim() !== '' || p.value?.trim() !== '')
      .map((p) => ({
        key: p.key.trim(),
        value: p.value,
        enabled: p.enabled !== false,
        description: p.description?.trim() || undefined,
      }));

    const headers = state.headers
      .filter((h) => h.key?.trim() !== '' || h.value?.trim() !== '')
      .map((h) => ({
        key: h.key.trim(),
        value: h.value,
        enabled: h.enabled !== false,
        description: h.description?.trim() || undefined,
      }));

    const bodyPayload = {
      mode: state.body.mode,
    };

    if (state.body.mode === 'json' || state.body.mode === 'text' || state.body.mode === 'raw') {
      bodyPayload.raw = state.body.raw;
    } else if (state.body.mode === 'x-www-form-urlencoded') {
      bodyPayload.urlencoded = state.body.urlencoded
        .filter((u) => u.key?.trim() !== '' || u.value?.trim() !== '')
        .map((u) => ({
          key: u.key.trim(),
          value: u.value,
          enabled: u.enabled !== false,
          description: u.description?.trim() || undefined,
        }));
    }

    return {
      name: state.name.trim(),
      method: state.method,
      url: state.url.trim(),
      folderId: state.folderId,
      queryParams,
      headers,
      auth: state.auth,
      body: bodyPayload,
      settings: state.settings,
    };
  },
}));

export default useRequestStore;
