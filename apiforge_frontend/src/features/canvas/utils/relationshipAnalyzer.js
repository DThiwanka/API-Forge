/**
 * API Relationship & Dependency Analyzer
 *
 * Lightweight, pure frontend utilities to discover explicit and inferred
 * relationships between API requests on the Spatial Canvas.
 *
 * SCOPE: Informational & visual only. No execution, chaining, or workflow runner.
 */

import { extractVariableNames } from '../../requests/utils/variableUtils.js';

// Common host variables that represent environment configuration rather than request-to-request dependencies
const IGNORED_ENV_VARS = new Set([
  'baseurl',
  'base_url',
  'host',
  'hostname',
  'port',
  'api_url',
  'apiurl',
  'url',
  'server',
  'env',
  'environment',
]);

const AUTH_VARIABLE_NAMES = new Set([
  'token',
  'authtoken',
  'auth_token',
  'accesstoken',
  'access_token',
  'jwt',
  'jwt_token',
  'bearer_token',
  'bearertoken',
  'apikey',
  'api_key',
  'session',
  'sessiontoken',
  'session_token',
  'id_token',
  'idtoken',
]);

/**
 * Normalizes a URL into canonical segments and identifies the primary resource key.
 * Strips environment variable prefixes, protocols, domain, query params, and IDs.
 *
 * Example: "{{baseUrl}}/api/v1/users/123/orders" ->
 * {
 *   resourceKey: 'users',
 *   canonicalPath: 'api/v1/users/:id/orders',
 *   segments: ['api', 'v1', 'users', ':id', 'orders']
 * }
 */
export function normalizeResourcePath(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { resourceKey: '', canonicalPath: '', segments: [] };
  }

  let cleaned = rawUrl.trim();

  // Strip query string and hash
  const qIdx = cleaned.indexOf('?');
  if (qIdx !== -1) cleaned = cleaned.slice(0, qIdx);
  const hIdx = cleaned.indexOf('#');
  if (hIdx !== -1) cleaned = cleaned.slice(0, hIdx);

  // Strip environment prefix like {{baseUrl}} or {{api_url}}
  cleaned = cleaned.replace(/^\{\{\s*[\w.-]+\s*\}\}/i, '');

  // Strip protocol and host (http://localhost:3000, https://api.example.com)
  cleaned = cleaned.replace(/^[a-zA-Z]+:\/\/[^/]+/i, '');

  // Strip leading/trailing slashes
  cleaned = cleaned.replace(/^\/+|\/+$/g, '');

  if (!cleaned) {
    return { resourceKey: '', canonicalPath: '', segments: [] };
  }

  const rawSegments = cleaned.split('/').filter(Boolean);

  // Normalize parameterized segments
  const segments = rawSegments.map((seg) => {
    // Check for :param or {param}
    if (/^:[\w.-]+$/.test(seg) || /^\{[\w.-]+\}$/.test(seg)) {
      return ':id';
    }
    // Check for numeric ID
    if (/^\d+$/.test(seg)) {
      return ':id';
    }
    // Check for UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
      return ':id';
    }
    // Check for 24-char MongoDB ObjectID
    if (/^[0-9a-f]{24}$/i.test(seg)) {
      return ':id';
    }
    return seg.toLowerCase();
  });

  const canonicalPath = segments.join('/');

  // Find the primary resource key (skip generic API prefixes like 'api', 'v1', 'v2', 'v3', 'rest')
  const ignoredPrefixes = new Set(['api', 'v1', 'v2', 'v3', 'v4', 'rest', 'public', 'private', 'admin']);
  let resourceKey = '';

  for (const seg of segments) {
    if (seg !== ':id' && !ignoredPrefixes.has(seg)) {
      resourceKey = seg;
      break;
    }
  }

  // Fallback to first non-id segment if all were ignored
  if (!resourceKey) {
    resourceKey = segments.find((s) => s !== ':id') || segments[0] || '';
  }

  return {
    resourceKey,
    canonicalPath,
    segments,
  };
}

/**
 * Extracts variables that this request produces (e.g. from extraction rules or auth conventions).
 */
export function extractRequestProducedVariables(request) {
  if (!request) return [];
  const produced = new Set();

  const settings = request.settings || {};
  const extractRules = Array.isArray(settings.extract)
    ? settings.extract
    : Array.isArray(request.extract)
    ? request.extract
    : [];

  for (const rule of extractRules) {
    const varName = rule?.variableName || rule?.key || rule?.targetVariable;
    if (varName && typeof varName === 'string') {
      const clean = varName.trim();
      if (clean) produced.add(clean);
    }
  }

  // Endpoint name / URL heuristic for auth tokens
  const url = (request.url || '').toLowerCase();
  const name = (request.name || '').toLowerCase();
  const isAuthEndpoint =
    (url.includes('/login') ||
      url.includes('/auth') ||
      url.includes('/token') ||
      url.includes('/oauth') ||
      name.includes('login') ||
      name.includes('authenticate')) &&
    (request.method || 'GET').toUpperCase() === 'POST';

  if (isAuthEndpoint && extractRules.length === 0) {
    produced.add('token');
    produced.add('authToken');
    produced.add('accessToken');
  }

  return Array.from(produced);
}

/**
 * Extracts variables that this request consumes across URL, params, headers, auth, and body.
 */
export function extractRequestConsumedVariables(request) {
  if (!request) return [];
  const rawTokens = [];

  // URL
  if (request.url) {
    rawTokens.push(...extractVariableNames(request.url));
  }

  // Query Params
  if (Array.isArray(request.params)) {
    for (const p of request.params) {
      if (p.key) rawTokens.push(...extractVariableNames(p.key));
      if (p.value) rawTokens.push(...extractVariableNames(p.value));
    }
  }

  // Headers
  if (Array.isArray(request.headers)) {
    for (const h of request.headers) {
      if (h.key) rawTokens.push(...extractVariableNames(h.key));
      if (h.value) rawTokens.push(...extractVariableNames(h.value));
    }
  }

  // Auth
  const auth = request.auth;
  if (auth) {
    if (auth.bearer?.token) rawTokens.push(...extractVariableNames(auth.bearer.token));
    if (auth.basic?.username) rawTokens.push(...extractVariableNames(auth.basic.username));
    if (auth.basic?.password) rawTokens.push(...extractVariableNames(auth.basic.password));
    if (auth.apiKey?.key) rawTokens.push(...extractVariableNames(auth.apiKey.key));
    if (auth.apiKey?.value) rawTokens.push(...extractVariableNames(auth.apiKey.value));
  }

  // Body
  const body = request.body;
  if (body) {
    if (typeof body === 'string') {
      rawTokens.push(...extractVariableNames(body));
    } else if (body.raw) {
      rawTokens.push(...extractVariableNames(body.raw));
    } else if (Array.isArray(body.formData)) {
      for (const item of body.formData) {
        if (item.key) rawTokens.push(...extractVariableNames(item.key));
        if (item.value) rawTokens.push(...extractVariableNames(item.value));
      }
    } else if (Array.isArray(body.urlEncoded)) {
      for (const item of body.urlEncoded) {
        if (item.key) rawTokens.push(...extractVariableNames(item.key));
        if (item.value) rawTokens.push(...extractVariableNames(item.value));
      }
    }
  }

  // Filter out host / generic environment variables
  return Array.from(new Set(rawTokens)).filter(
    (name) => !IGNORED_ENV_VARS.has(name.toLowerCase())
  );
}

/**
 * Checks if a variable name indicates authentication credentials.
 */
export function isAuthVariable(varName = '') {
  return AUTH_VARIABLE_NAMES.has(varName.toLowerCase().replace(/[-_]/g, ''));
}

/**
 * Infers relationships between nodes on the canvas.
 *
 * Returns an array of React Flow edge objects styled for relationship visualization.
 */
export function inferRelationships(nodes = [], options = {}) {
  const { maxEdgesPerNode = 4 } = options;
  if (!Array.isArray(nodes) || nodes.length < 2) return [];

  // Filter only request nodes
  const requestNodes = nodes.filter((n) => n.type === 'requestNode');
  if (requestNodes.length < 2) return [];

  // Precompute metadata for all request nodes
  const metaList = requestNodes.map((node) => {
    const data = node.data || {};
    const produced = extractRequestProducedVariables(data);
    const consumed = extractRequestConsumedVariables(data);
    const norm = normalizeResourcePath(data.url || '');

    const hasAuthHeaderOrBearer =
      Boolean(data.auth?.bearer?.token) ||
      (Array.isArray(data.headers) &&
        data.headers.some(
          (h) => (h.key || '').toLowerCase() === 'authorization'
        ));

    return {
      nodeId: node.id,
      name: data.name || 'Untitled Request',
      method: (data.method || 'GET').toUpperCase(),
      url: data.url || '',
      produced,
      consumed,
      hasAuthRequirement: hasAuthHeaderOrBearer,
      resourceKey: norm.resourceKey,
      canonicalPath: norm.canonicalPath,
      collectionId: data.collectionId,
    };
  });

  const edges = [];
  const edgePairMap = new Map(); // key: `${source}->${target}` or undirected

  const addEdgeIfNotExists = (sourceMeta, targetMeta, relData) => {
    if (sourceMeta.nodeId === targetMeta.nodeId) return;

    const pairKey = `${sourceMeta.nodeId}->${targetMeta.nodeId}`;
    const reverseKey = `${targetMeta.nodeId}->${sourceMeta.nodeId}`;

    if (edgePairMap.has(pairKey)) {
      const existing = edgePairMap.get(pairKey);
      // Upgrade relationship if higher priority: AUTH > VARIABLE > RESOURCE
      if (
        (relData.relationshipType === 'AUTH' && existing.relationshipType !== 'AUTH') ||
        (relData.relationshipType === 'VARIABLE' && existing.relationshipType === 'RESOURCE')
      ) {
        existing.relationshipType = relData.relationshipType;
        existing.label = relData.label;
        existing.reason = relData.reason;
        existing.variableNames = relData.variableNames;
      }
      return;
    }

    if (relData.relationshipType === 'RESOURCE' && edgePairMap.has(reverseKey)) {
      return; // Resource relationship is undirected, don't duplicate
    }

    const edge = {
      id: `inferred-${sourceMeta.nodeId}-${targetMeta.nodeId}-${relData.relationshipType.toLowerCase()}`,
      source: sourceMeta.nodeId,
      target: targetMeta.nodeId,
      type: 'relationship',
      animated: relData.relationshipType === 'AUTH',
      data: {
        isInferred: true,
        relationshipType: relData.relationshipType, // 'AUTH' | 'VARIABLE' | 'RESOURCE'
        label: relData.label,
        reason: relData.reason,
        variableNames: relData.variableNames || [],
        resourceKey: relData.resourceKey || '',
        sourceName: sourceMeta.name,
        targetName: targetMeta.name,
        sourceMethod: sourceMeta.method,
        targetMethod: targetMeta.method,
        confidence: relData.confidence || 'high',
      },
    };

    edgePairMap.set(pairKey, edge.data);
    edges.push(edge);
  };

  // 1. VARIABLE DEPENDENCIES (A produces X, B consumes X)
  const producerMap = new Map(); // varName -> [meta]
  for (const meta of metaList) {
    for (const v of meta.produced) {
      const lower = v.toLowerCase();
      if (!producerMap.has(lower)) producerMap.set(lower, []);
      producerMap.get(lower).push({ meta, originalName: v });
    }
  }

  for (const consumer of metaList) {
    for (const consVar of consumer.consumed) {
      const lower = consVar.toLowerCase();
      const producers = producerMap.get(lower);
      if (producers) {
        for (const prod of producers) {
          if (prod.meta.nodeId !== consumer.nodeId) {
            const isAuth = isAuthVariable(consVar);
            const relType = isAuth ? 'AUTH' : 'VARIABLE';
            addEdgeIfNotExists(prod.meta, consumer, {
              relationshipType: relType,
              label: isAuth ? 'auth token' : `{{${consVar}}}`,
              reason: `Request "${consumer.name}" consumes {{${consVar}}} produced by "${prod.meta.name}"`,
              variableNames: [consVar],
              confidence: 'high',
            });
          }
        }
      }
    }
  }

  // 2. AUTH HEURISTIC DEPENDENCIES
  // If an auth endpoint exists (e.g. POST /auth/login) and other requests require Bearer / Auth
  const authProducers = metaList.filter(
    (m) =>
      m.method === 'POST' &&
      (m.url.toLowerCase().includes('/login') ||
        m.url.toLowerCase().includes('/token') ||
        m.url.toLowerCase().includes('/auth') ||
        m.name.toLowerCase().includes('login'))
  );

  if (authProducers.length === 1) {
    const authNode = authProducers[0];
    for (const target of metaList) {
      if (target.nodeId !== authNode.nodeId && target.hasAuthRequirement) {
        const pairKey = `${authNode.nodeId}->${target.nodeId}`;
        if (!edgePairMap.has(pairKey)) {
          addEdgeIfNotExists(authNode, target, {
            relationshipType: 'AUTH',
            label: 'authenticates',
            reason: `"${authNode.name}" provides authentication credentials used by "${target.name}"`,
            variableNames: ['authToken'],
            confidence: 'high',
          });
        }
      }
    }
  }

  // 3. RESOURCE PATH PROXIMITY
  // Group by resourceKey (e.g. 'users', 'orders', 'products')
  const resourceGroups = new Map();
  for (const meta of metaList) {
    if (meta.resourceKey && meta.resourceKey.length > 2) {
      if (!resourceGroups.has(meta.resourceKey)) {
        resourceGroups.set(meta.resourceKey, []);
      }
      resourceGroups.get(meta.resourceKey).push(meta);
    }
  }

  for (const [resKey, group] of resourceGroups.entries()) {
    if (group.length >= 2) {
      // Find an anchor node (collection-level GET or POST without :id)
      let anchor = group.find(
        (m) => (m.method === 'GET' || m.method === 'POST') && !m.canonicalPath.includes(':id')
      );
      if (!anchor) anchor = group[0];

      for (const target of group) {
        if (target.nodeId !== anchor.nodeId) {
          addEdgeIfNotExists(anchor, target, {
            relationshipType: 'RESOURCE',
            label: `/${resKey}`,
            reason: `Both requests operate on the "${resKey}" resource`,
            resourceKey: resKey,
            confidence: 'medium',
          });
        }
      }
    }
  }

  // Limit edges per node if needed to prevent hairball graphs
  if (maxEdgesPerNode > 0) {
    const nodeDegree = new Map();
    const filteredEdges = [];

    for (const e of edges) {
      const srcCount = nodeDegree.get(e.source) || 0;
      const tgtCount = nodeDegree.get(e.target) || 0;

      if (srcCount < maxEdgesPerNode && tgtCount < maxEdgesPerNode) {
        nodeDegree.set(e.source, srcCount + 1);
        nodeDegree.set(e.target, tgtCount + 1);
        filteredEdges.push(e);
      }
    }
    return filteredEdges;
  }

  return edges;
}

/**
 * Filter relationships based on active filter setting.
 */
export function filterEdges(allEdges = [], filter = 'all', typeFilters = { resource: true, variable: true, auth: true }) {
  if (filter === 'none') {
    return [];
  }

  return allEdges.filter((edge) => {
    const isExplicit = !edge.data?.isInferred;
    if (isExplicit) {
      return filter === 'all' || filter === 'explicit';
    }

    // Inferred edge
    if (filter === 'explicit') return false;

    const relType = edge.data?.relationshipType;
    if (relType === 'RESOURCE' && !typeFilters.resource) return false;
    if (relType === 'VARIABLE' && !typeFilters.variable) return false;
    if (relType === 'AUTH' && !typeFilters.auth) return false;

    return true;
  });
}

