/**
 * Lightweight Real-Time Collaboration WebSocket Client
 */

function resolveDefaultWsUrl() {
  if (typeof window === 'undefined') return 'ws://localhost:5000/ws';
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  try {
    const parsed = new URL(apiBase, window.location.href);
    const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${parsed.host}/ws`;
  } catch {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
}

export class WebSocketClient {
  constructor(url) {
    this.url = url || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || resolveDefaultWsUrl();
    this.ws = null;
    this.token = null;
    this.activeWorkspaceId = null;
    this.currentResource = null;
    this.status = 'offline'; // 'offline' | 'connecting' | 'connected' | 'reconnecting'
    this.listeners = new Map(); // eventType -> Set<callback>
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelayMs = 15000;
    this.isExplicitlyClosed = false;
  }

  /**
   * Set connection status and notify listeners
   */
  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.statusListeners) {
        try {
          listener(newStatus);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  /**
   * Connect to WebSocket server
   */
  connect(token = null) {
    if (token) this.token = token;
    this.isExplicitlyClosed = false;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const fullUrl = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');

        // Authenticate via message if token exists and was not passed in URL
        if (this.token) {
          this.send({ type: 'auth', token: this.token });
        }

        // Restore active workspace subscription if exists
        if (this.activeWorkspaceId) {
          this.subscribeWorkspace(this.activeWorkspaceId);
        }

        // Restore active resource presence
        if (this.currentResource && this.activeWorkspaceId) {
          this.updatePresence(this.activeWorkspaceId, this.currentResource);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message);
          this.emit('*', message);
        } catch {
          // ignore invalid JSON
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('offline');
        }
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule automatic reconnect with bounded exponential backoff
   */
  scheduleReconnect() {
    if (this.isExplicitlyClosed) return;
    this.setStatus('reconnecting');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Bounded backoff: 1s, 2s, 4s, 8s, max 15s (+ jitter)
    const baseDelay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelayMs);
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseDelay + jitter;

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.token);
    }, delay);
  }

  /**
   * Send JSON message to server
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      try {
        this.ws.send(JSON.stringify(data));
      } catch {
        // ignore write error
      }
    }
  }

  /**
   * Subscribe to a workspace channel
   */
  subscribeWorkspace(workspaceId) {
    this.activeWorkspaceId = workspaceId;
    this.send({
      type: 'workspace.subscribe',
      workspaceId,
    });
  }

  /**
   * Unsubscribe from a workspace channel
   */
  unsubscribeWorkspace(workspaceId) {
    if (this.activeWorkspaceId === workspaceId) {
      this.activeWorkspaceId = null;
      this.currentResource = null;
    }
    this.send({
      type: 'workspace.unsubscribe',
      workspaceId,
    });
  }

  /**
   * Send ephemeral presence update
   */
  updatePresence(workspaceId, currentResource) {
    this.currentResource = currentResource;
    this.send({
      type: 'presence.update',
      workspaceId,
      currentResource,
    });
  }

  /**
   * Announce user opened a request
   */
  openRequest(workspaceId, requestId, requestName) {
    this.currentResource = { type: 'request', resourceId: requestId, resourceName: requestName };
    this.send({
      type: 'request.opened',
      workspaceId,
      requestId,
      requestName,
    });
  }

  /**
   * Announce user closed/left a request
   */
  closeRequest(workspaceId, requestId) {
    if (this.currentResource?.resourceId === requestId) {
      this.currentResource = null;
    }
    this.send({
      type: 'request.closed',
      workspaceId,
      requestId,
    });
  }

  /**
   * Register event listener
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);
    return () => this.off(type, callback);
  }

  /**
   * Remove event listener
   */
  off(type, callback) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(callback);
    }
  }

  /**
   * Emit event to internal listeners
   */
  emit(type, payload) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(payload);
        } catch {
          // ignore callback error
        }
      }
    }
  }

  /**
   * Explicitly disconnect from server
   */
  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('offline');
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
