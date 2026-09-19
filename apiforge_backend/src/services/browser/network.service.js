import crypto from 'node:crypto';
import env from '../../config/env.js';
import {
  redactHeaders as centralizedRedactHeaders,
  isSensitiveQueryParam,
  MASKED_TEXT,
} from '../../utils/redaction.js';

export const REDACTED_PLACEHOLDER = MASKED_TEXT;

/**
 * In-memory tab network event buffers: tabId -> Array<NetworkEvent>
 * Bounded by env.BROWSER_MAX_NETWORK_EVENTS_PER_TAB
 */
const tabNetworkEvents = new Map();

/**
 * SSE subscribers: tabId -> Set<http.ServerResponse>
 */
const tabSubscribers = new Map();

/**
 * Redacts sensitive header values
 */
export function redactHeaders(headers) {
  return centralizedRedactHeaders(headers, REDACTED_PLACEHOLDER);
}

/**
 * Parse URL components safely with sensitive query parameters redacted
 */
function parseUrlDetails(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const queryParams = [];
    parsed.searchParams.forEach((value, key) => {
      const safeVal = isSensitiveQueryParam(key) ? REDACTED_PLACEHOLDER : value;
      queryParams.push({ key, value: safeVal });
      if (safeVal !== value) {
        parsed.searchParams.set(key, safeVal);
      }
    });
    return {
      pathname: parsed.pathname || '/',
      hostname: parsed.hostname || '',
      search: parsed.search || '',
      queryParams,
    };
  } catch {
    return {
      pathname: rawUrl,
      hostname: '',
      search: '',
      queryParams: [],
    };
  }
}

/**
 * Infer resource type from resourceType string or content-type header
 */
function normalizeResourceType(rawType, contentType = '') {
  const type = (rawType || '').toLowerCase();
  const ct = (contentType || '').toLowerCase();

  if (type === 'fetch' || type === 'xhr' || ct.includes('json') || ct.includes('xml')) {
    return 'fetch';
  }
  if (type === 'document' || ct.includes('text/html')) {
    return 'document';
  }
  if (type === 'script' || ct.includes('javascript')) {
    return 'script';
  }
  if (type === 'stylesheet' || ct.includes('text/css')) {
    return 'stylesheet';
  }
  if (type === 'image' || ct.includes('image/')) {
    return 'image';
  }
  if (type === 'font' || ct.includes('font/')) {
    return 'font';
  }
  return type || 'other';
}

/**
 * Push an event to SSE clients listening to this tab
 */
function broadcastTabEvent(tabId, eventType, data) {
  const subs = tabSubscribers.get(tabId);
  if (!subs || subs.size === 0) return;

  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of Array.from(subs)) {
    try {
      client.write(payload);
    } catch {
      subs.delete(client);
    }
  }
}

/**
 * Record an outgoing network request
 */
export function recordRequest(tabId, req) {
  if (!tabId) return null;

  const url = typeof req.url === 'function' ? req.url() : req.url || '';
  if (!url || url.startsWith('data:') || url.startsWith('javascript:')) {
    return null;
  }

  const method = (typeof req.method === 'function' ? req.method() : req.method || 'GET').toUpperCase();
  const rawHeaders = typeof req.headers === 'function' ? req.headers() : req.headers || {};
  const rawType = typeof req.resourceType === 'function' ? req.resourceType() : req.resourceType || 'other';

  const { pathname, hostname, search, queryParams } = parseUrlDetails(url);
  const rawPostData = typeof req.postData === 'function' ? req.postData() : req.postData || null;
  const postData = rawPostData ? String(rawPostData).slice(0, 50000) : null;
  const now = Date.now();

  const event = {
    id: crypto.randomUUID(),
    tabId,
    method,
    url,
    pathname,
    hostname,
    search,
    queryParams,
    resourceType: normalizeResourceType(rawType),
    state: 'pending',
    status: null,
    statusText: null,
    durationMs: null,
    sizeBytes: null,
    requestHeaders: redactHeaders(rawHeaders),
    responseHeaders: {},
    postData,
    error: null,
    timestamp: new Date(now).toISOString(),
    startTime: now,
    endTime: null,
  };

  let events = tabNetworkEvents.get(tabId);
  if (!events) {
    events = [];
    tabNetworkEvents.set(tabId, events);
  }

  // Enforce bounded limit
  const maxEvents = env.BROWSER_MAX_NETWORK_EVENTS_PER_TAB || 500;
  if (events.length >= maxEvents) {
    events.splice(0, events.length - maxEvents + 1);
  }

  events.push(event);
  broadcastTabEvent(tabId, 'network_request', event);

  return event;
}

/**
 * Record an incoming network response
 */
export function recordResponse(tabId, res, eventId) {
  if (!tabId) return null;

  const events = tabNetworkEvents.get(tabId);
  if (!events || events.length === 0) return null;

  let targetEvent = null;
  if (eventId) {
    targetEvent = events.find((e) => e.id === eventId);
  }

  // Fallback: match by URL if eventId was not correlated
  if (!targetEvent) {
    const resUrl = typeof res.url === 'function' ? res.url() : res.url;
    targetEvent = [...events].reverse().find((e) => e.state === 'pending' && (!resUrl || e.url === resUrl));
  }

  if (!targetEvent) return null;

  const now = Date.now();
  const status = typeof res.status === 'function' ? res.status() : res.status || 200;
  const statusText = typeof res.statusText === 'function' ? res.statusText() : res.statusText || 'OK';
  const rawHeaders = typeof res.headers === 'function' ? res.headers() : res.headers || {};
  const redactedResponseHeaders = redactHeaders(rawHeaders);

  const contentLengthHeader = rawHeaders['content-length'] || rawHeaders['Content-Length'];
  let sizeBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
  if (Number.isNaN(sizeBytes)) sizeBytes = null;

  targetEvent.state = 'completed';
  targetEvent.status = status;
  targetEvent.statusText = statusText;
  targetEvent.endTime = now;
  targetEvent.durationMs = Math.max(0, now - targetEvent.startTime);
  targetEvent.sizeBytes = sizeBytes;
  targetEvent.responseHeaders = redactedResponseHeaders;

  const contentType = rawHeaders['content-type'] || rawHeaders['Content-Type'] || '';
  targetEvent.resourceType = normalizeResourceType(targetEvent.resourceType, contentType);

  broadcastTabEvent(tabId, 'network_response', targetEvent);
  return targetEvent;
}

/**
 * Record a failed network request
 */
export function recordRequestFailed(tabId, req, eventId) {
  if (!tabId) return null;

  const events = tabNetworkEvents.get(tabId);
  if (!events || events.length === 0) return null;

  let targetEvent = null;
  if (eventId) {
    targetEvent = events.find((e) => e.id === eventId);
  }

  if (!targetEvent) {
    const reqUrl = typeof req.url === 'function' ? req.url() : req.url;
    targetEvent = [...events].reverse().find((e) => e.state === 'pending' && (!reqUrl || e.url === reqUrl));
  }

  if (!targetEvent) return null;

  const now = Date.now();
  const failure = typeof req.failure === 'function' ? req.failure() : req.failure;
  const errorText = failure?.errorText || req.errorText || 'Request failed';

  targetEvent.state = 'failed';
  targetEvent.endTime = now;
  targetEvent.durationMs = Math.max(0, now - targetEvent.startTime);
  targetEvent.error = errorText;

  broadcastTabEvent(tabId, 'network_failed', targetEvent);
  return targetEvent;
}

/**
 * Attach listeners to a Playwright Page or IsolatedPageDriver
 */
export function attachNetworkListeners(tabId, page) {
  if (!page || !page.on) return;

  const requestToEventMap = new WeakMap();

  page.on('request', (req) => {
    try {
      const event = recordRequest(tabId, req);
      if (event && req && typeof req === 'object') {
        requestToEventMap.set(req, event.id);
      }
    } catch {
      // Non-blocking
    }
  });

  page.on('response', (res) => {
    try {
      const req = typeof res.request === 'function' ? res.request() : null;
      const eventId = req ? requestToEventMap.get(req) : null;
      recordResponse(tabId, res, eventId);
    } catch {
      // Non-blocking
    }
  });

  page.on('requestfailed', (req) => {
    try {
      const eventId = req && typeof req === 'object' ? requestToEventMap.get(req) : null;
      recordRequestFailed(tabId, req, eventId);
    } catch {
      // Non-blocking
    }
  });
}

/**
 * Get all captured network events for a tab
 */
export function getTabNetworkEvents(tabId) {
  return tabNetworkEvents.get(tabId) || [];
}

/**
 * Clear captured network events for a tab
 */
export function clearTabNetworkEvents(tabId) {
  tabNetworkEvents.set(tabId, []);
  broadcastTabEvent(tabId, 'network_clear', { tabId });
  return { success: true, tabId };
}

/**
 * Remove network buffer and subscribers when a tab is closed
 */
export function removeTab(tabId) {
  tabNetworkEvents.delete(tabId);
  const subs = tabSubscribers.get(tabId);
  if (subs) {
    for (const client of subs) {
      try {
        client.end();
      } catch {
        // Ignore
      }
    }
    tabSubscribers.delete(tabId);
  }
}

/**
 * Remove all tab network data when a session is closed
 */
export function removeSession(session) {
  if (!session || !session.tabs) return;
  for (const tab of session.tabs) {
    removeTab(tab.id);
  }
}

/**
 * Subscribe an SSE client to a tab's network events
 */
export function subscribeTabEvents(tabId, res) {
  let subs = tabSubscribers.get(tabId);
  if (!subs) {
    subs = new Set();
    tabSubscribers.set(tabId, subs);
  }
  subs.add(res);

  return () => {
    subs.delete(res);
    if (subs.size === 0) {
      tabSubscribers.delete(tabId);
    }
  };
}

/**
 * Lookup a single network event by eventId across all tabs
 */
export function getNetworkEvent(eventId) {
  if (!eventId) return null;
  for (const events of tabNetworkEvents.values()) {
    const found = events.find((e) => e.id === eventId);
    if (found) return found;
  }
  return null;
}

/**
 * Reset all buffers (for unit tests)
 */
export function resetNetworkBuffers() {
  tabNetworkEvents.clear();
  tabSubscribers.clear();
}

export default {
  redactHeaders,
  recordRequest,
  recordResponse,
  recordRequestFailed,
  attachNetworkListeners,
  getTabNetworkEvents,
  getNetworkEvent,
  clearTabNetworkEvents,
  removeTab,
  removeSession,
  subscribeTabEvents,
  resetNetworkBuffers,
};

