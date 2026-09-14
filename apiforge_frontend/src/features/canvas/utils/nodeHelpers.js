/**
 * Canvas Node Helpers
 * Pure utilities for node transformations, layouts, and serialization.
 */

export const METHOD_COLORS = {
  GET: {
    badge: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60',
    dot: '#10b981',
  },
  POST: {
    badge: 'text-sky-400 bg-sky-950/60 border-sky-700/60',
    dot: '#0ea5e9',
  },
  PUT: {
    badge: 'text-amber-400 bg-amber-950/60 border-amber-700/60',
    dot: '#f59e0b',
  },
  PATCH: {
    badge: 'text-violet-400 bg-violet-950/60 border-violet-700/60',
    dot: '#8b5cf6',
  },
  DELETE: {
    badge: 'text-rose-400 bg-rose-950/60 border-rose-700/60',
    dot: '#f43f5e',
  },
  HEAD: {
    badge: 'text-slate-300 bg-slate-800/60 border-slate-600/60',
    dot: '#94a3b8',
  },
  OPTIONS: {
    badge: 'text-indigo-400 bg-indigo-950/60 border-indigo-700/60',
    dot: '#818cf8',
  },
};

export function getMethodStyle(method = 'GET') {
  const upper = (method || 'GET').toUpperCase();
  return METHOD_COLORS[upper] || {
    badge: 'text-slate-300 bg-slate-800/60 border-slate-600/60',
    dot: '#94a3b8',
  };
}

export function getCanvasStorageKey(workspaceId) {
  return `apiforge.canvas.${workspaceId}`;
}

/**
 * Convert backend request to a React Flow node
 */
export function requestToNode(
  request,
  position = { x: 100, y: 100 },
  collectionName = 'Collection',
  folderName = null
) {
  const effectiveFolderName = folderName || request.folderName || null;
  const breadcrumb = effectiveFolderName
    ? `${collectionName} / ${effectiveFolderName}`
    : collectionName;

  return {
    id: request.id,
    type: 'requestNode',
    position: {
      x: typeof position?.x === 'number' ? position.x : 100,
      y: typeof position?.y === 'number' ? position.y : 100,
    },
    data: {
      requestId: request.id,
      collectionId: request.collectionId,
      collectionName: collectionName || 'Collection',
      folderId: request.folderId || null,
      folderName: effectiveFolderName,
      breadcrumb,
      name: request.name || 'Untitled Request',
      method: (request.method || 'GET').toUpperCase(),
      url: request.url || '',
      lastStatus: request.lastStatus || null,
      lastDurationMs: request.lastDurationMs || null,
    },
  };
}

/**
 * Arrange an arbitrary set of existing canvas nodes into a clean grid
 * grouped by collection
 */
export function arrangeNodesLayout(nodes = [], collections = []) {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];

  const collectionMap = new Map();
  collections.forEach((c) => collectionMap.set(c.id, c.name));

  // Group nodes by collectionId
  const grouped = new Map();
  nodes.forEach((node) => {
    const colId = node.data?.collectionId || 'default';
    const list = grouped.get(colId) || [];
    list.push(node);
    grouped.set(colId, list);
  });

  const colsPerRow = 3;
  const spacingX = 320;
  const spacingY = 160;
  let currentY = 80;

  const arrangedNodes = [];

  for (const [, colNodes] of grouped.entries()) {
    colNodes.forEach((node, idx) => {
      const col = idx % colsPerRow;
      const row = Math.floor(idx / colsPerRow);
      const x = 80 + col * spacingX;
      const y = currentY + row * spacingY;

      arrangedNodes.push({
        ...node,
        position: { x, y },
      });
    });

    const totalRows = Math.ceil(colNodes.length / colsPerRow) || 1;
    currentY += totalRows * spacingY + 80;
  }

  return arrangedNodes;
}

/**
 * Compute deterministic layout grouped by collections
 */
export function computeDeterministicLayout(requests = [], collections = []) {
  const collectionMap = new Map();
  collections.forEach((c) => collectionMap.set(c.id, c.name));

  // Group requests by collectionId
  const grouped = new Map();
  requests.forEach((req) => {
    const list = grouped.get(req.collectionId) || [];
    list.push(req);
    grouped.set(req.collectionId, list);
  });

  const nodes = [];
  let currentY = 80;

  for (const [colId, reqs] of grouped.entries()) {
    const colName = collectionMap.get(colId) || 'Collection';
    const colsPerRow = 3;
    const spacingX = 320;
    const spacingY = 160;

    reqs.forEach((req, idx) => {
      const col = idx % colsPerRow;
      const row = Math.floor(idx / colsPerRow);
      const x = 80 + col * spacingX;
      const y = currentY + row * spacingY;

      nodes.push(requestToNode(req, { x, y }, colName, req.folderName));
    });

    const totalRows = Math.ceil(reqs.length / colsPerRow) || 1;
    currentY += totalRows * spacingY + 80;
  }

  return { nodes, edges: [] };
}

/**
 * Serialize canvas layout for localStorage
 * Strictly layout only - no secrets or bodies
 */
export function serializeCanvas(nodes = [], edges = [], viewport = { x: 0, y: 0, zoom: 1 }) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      position: n.position,
      type: n.type,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
    })),
    viewport: {
      x: viewport?.x || 0,
      y: viewport?.y || 0,
      zoom: viewport?.zoom || 1,
    },
  };
}

/**
 * Reconcile saved layout with current workspace requests from server
 * Prunes deleted requests and edges
 */
export function deserializeCanvas(savedLayout, availableRequests = [], collections = []) {
  if (!savedLayout || !Array.isArray(savedLayout.nodes)) {
    return null;
  }

  const requestMap = new Map();
  availableRequests.forEach((req) => requestMap.set(req.id, req));

  const collectionMap = new Map();
  collections.forEach((c) => collectionMap.set(c.id, c.name));

  const validNodes = [];
  const validNodeIds = new Set();

  for (const savedNode of savedLayout.nodes) {
    const req = requestMap.get(savedNode.id);
    if (req) {
      const colName = collectionMap.get(req.collectionId) || 'Collection';
      validNodes.push(requestToNode(req, savedNode.position, colName));
      validNodeIds.add(savedNode.id);
    }
  }

  const validEdges = [];
  if (Array.isArray(savedLayout.edges)) {
    for (const edge of savedLayout.edges) {
      if (validNodeIds.has(edge.source) && validNodeIds.has(edge.target)) {
        validEdges.push({
          id: edge.id || `e-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          animated: false,
          style: { stroke: '#475569', strokeWidth: 1.5 },
        });
      }
    }
  }

  return {
    nodes: validNodes,
    edges: validEdges,
    viewport: savedLayout.viewport || { x: 0, y: 0, zoom: 1 },
  };
}

