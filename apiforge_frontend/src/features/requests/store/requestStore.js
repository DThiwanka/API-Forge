import { create } from 'zustand';

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
  return {
    timeout: typeof settings?.timeout === 'number' ? settings.timeout : 30000,
    followRedirects: settings?.followRedirects !== false,
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
  },
  isDirty: false,
  isSaving: false,
  isExecuting: false,
  activeTab: 'params', // 'params' | 'headers' | 'auth' | 'body' | 'settings'

  loadRequest: (request, workspaceId, collectionId) => {
    if (!request) return;
    set({
      id: request.id,
      workspaceId: workspaceId || request.workspaceId,
      collectionId: collectionId || request.collectionId,
      folderId: request.folderId || null,
      name: request.name || 'Untitled Request',
      method: (request.method || 'GET').toUpperCase(),
      url: request.url || '',
      queryParams: normalizeArray(request.queryParams),
      headers: normalizeArray(request.headers),
      auth: normalizeAuth(request.auth),
      body: normalizeBody(request.body),
      settings: normalizeSettings(request.settings),
      isDirty: false,
      isSaving: false,
      isExecuting: false,
    });
  },

  setName: (name) => set({ name, isDirty: true }),

  setMethod: (method) => set({ method: method.toUpperCase(), isDirty: true }),

  setUrl: (url) => set({ url, isDirty: true }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setIsSaving: (isSaving) => set({ isSaving }),

  setIsExecuting: (isExecuting) => set({ isExecuting }),

  // Query Params
  setQueryParams: (queryParams) => set({ queryParams, isDirty: true }),

  updateQueryParam: (index, field, value) => {
    const list = [...get().queryParams];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    // Auto-append row if typing on the last empty row
    if (index === list.length - 1 && (list[index].key || list[index].value)) {
      list.push({ key: '', value: '', enabled: true, description: '' });
    }
    set({ queryParams: list, isDirty: true });
  },

  addQueryParam: () => {
    set((state) => ({
      queryParams: [...state.queryParams, { key: '', value: '', enabled: true, description: '' }],
      isDirty: true,
    }));
  },

  removeQueryParam: (index) => {
    set((state) => {
      let next = state.queryParams.filter((_, i) => i !== index);
      if (next.length === 0) {
        next = [{ key: '', value: '', enabled: true, description: '' }];
      }
      return { queryParams: next, isDirty: true };
    });
  },

  // Headers
  setHeaders: (headers) => set({ headers, isDirty: true }),

  updateHeader: (index, field, value) => {
    const list = [...get().headers];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    // Auto-append row if typing on the last empty row
    if (index === list.length - 1 && (list[index].key || list[index].value)) {
      list.push({ key: '', value: '', enabled: true, description: '' });
    }
    set({ headers: list, isDirty: true });
  },

  addHeader: () => {
    set((state) => ({
      headers: [...state.headers, { key: '', value: '', enabled: true, description: '' }],
      isDirty: true,
    }));
  },

  removeHeader: (index) => {
    set((state) => {
      let next = state.headers.filter((_, i) => i !== index);
      if (next.length === 0) {
        next = [{ key: '', value: '', enabled: true, description: '' }];
      }
      return { headers: next, isDirty: true };
    });
  },

  // Auth
  setAuth: (auth) => set({ auth: normalizeAuth(auth), isDirty: true }),

  setAuthType: (type) =>
    set((state) => ({
      auth: { ...state.auth, type },
      isDirty: true,
    })),

  updateAuthBearer: (field, value) =>
    set((state) => ({
      auth: {
        ...state.auth,
        bearer: { ...state.auth.bearer, [field]: value },
      },
      isDirty: true,
    })),

  updateAuthBasic: (field, value) =>
    set((state) => ({
      auth: {
        ...state.auth,
        basic: { ...state.auth.basic, [field]: value },
      },
      isDirty: true,
    })),

  updateAuthApiKey: (field, value) =>
    set((state) => ({
      auth: {
        ...state.auth,
        apiKey: { ...state.auth.apiKey, [field]: value },
      },
      isDirty: true,
    })),

  // Body
  setBody: (body) => set({ body: normalizeBody(body), isDirty: true }),

  setBodyMode: (mode) =>
    set((state) => ({
      body: { ...state.body, mode },
      isDirty: true,
    })),

  setBodyRaw: (raw) =>
    set((state) => ({
      body: { ...state.body, raw },
      isDirty: true,
    })),

  updateBodyUrlEncoded: (index, field, value) => {
    const list = [...get().body.urlencoded];
    if (!list[index]) return;
    list[index] = { ...list[index], [field]: value };
    if (index === list.length - 1 && (list[index].key || list[index].value)) {
      list.push({ key: '', value: '', enabled: true, description: '' });
    }
    set((state) => ({
      body: { ...state.body, urlencoded: list },
      isDirty: true,
    }));
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
  },

  // Settings
  setSettings: (settings) => set({ settings: normalizeSettings(settings), isDirty: true }),

  updateSetting: (field, value) =>
    set((state) => ({
      settings: { ...state.settings, [field]: value },
      isDirty: true,
    })),

  markClean: () => set({ isDirty: false }),

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

