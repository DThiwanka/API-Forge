import { WebSocketServer, WebSocket } from 'ws';
import tokenService, { COOKIE_NAMES } from '../auth/token.service.js';
import userRepository from '../../repositories/user.repository.js';
import workspaceRepository from '../../repositories/workspace.repository.js';

class RealtimeService {
  constructor() {
    this.wss = null;
    this.heartbeatInterval = null;
    /** Map<WebSocket, { user: object|null, activeWorkspaceId: string|null, isAlive: boolean, currentResource: object|null }> */
    this.clients = new Map();
    /** Map<string, Set<WebSocket>> (workspaceId -> Set of sockets) */
    this.workspaceSubscriptions = new Map();
    /** Map<string, Map<string, object>> (workspaceId -> Map<userId, PresenceRecord>) */
    this.workspacePresence = new Map();
  }

  /**
   * Initialize the WebSocket server attached to an HTTP server
   * @param {import('http').Server} server
   */
  init(server) {
    if (this.wss) {
      return this.wss;
    }

    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat mechanism every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      for (const [ws, data] of this.clients.entries()) {
        if (!data.isAlive) {
          this.terminateClient(ws);
        } else {
          data.isAlive = false;
          try {
            ws.ping();
          } catch {
            this.terminateClient(ws);
          }
        }
      }
    }, 30000);

    return this.wss;
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, req) {
    const clientData = {
      user: null,
      activeWorkspaceId: null,
      isAlive: true,
      currentResource: null,
    };
    this.clients.set(ws, clientData);

    ws.on('pong', () => {
      const data = this.clients.get(ws);
      if (data) {
        data.isAlive = true;
      }
    });

    // Try authenticating from URL query or cookie on initial connection
    try {
      let token = null;

      // 1. Check query parameter `?token=...` or `?access_token=...`
      if (req.url && req.url.includes('?')) {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        token = urlParams.get('token') || urlParams.get('access_token');
      }

      // 2. Check Cookie header
      if (!token && req.headers.cookie) {
        const cookies = this.parseCookies(req.headers.cookie);
        token = cookies[COOKIE_NAMES.ACCESS_TOKEN];
      }

      if (token) {
        await this.authenticateClient(ws, token);
      }
    } catch {
      // Allow unauthenticated connection to remain open briefly for { type: 'auth' } message
    }

    ws.on('message', async (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        await this.handleMessage(ws, message);
      } catch (err) {
        this.sendError(ws, err.message || 'Invalid message payload');
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
    });

    ws.on('error', () => {
      this.handleDisconnect(ws);
    });

    // Send connection established confirmation
    this.send(ws, {
      type: 'connection.established',
      authenticated: Boolean(clientData.user),
      user: clientData.user
        ? { id: clientData.user.id, name: clientData.user.name, email: clientData.user.email }
        : null,
    });
  }

  /**
   * Authenticate a client with access token
   */
  async authenticateClient(ws, token) {
    const clientData = this.clients.get(ws);
    if (!clientData) return false;

    try {
      const decoded = tokenService.verifyAccessToken(token);
      const user = await userRepository.findActiveById(decoded.sub);
      if (!user) {
        throw new Error('User not found or inactive');
      }

      clientData.user = {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        email: user.email,
      };

      this.send(ws, {
        type: 'auth.success',
        user: clientData.user,
      });
      return true;
    } catch (err) {
      this.send(ws, {
        type: 'auth.error',
        message: err.message || 'Authentication failed',
      });
      return false;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws, message) {
    const data = this.clients.get(ws);
    if (!data) return;

    switch (message.type) {
      case 'auth': {
        if (!message.token) {
          return this.sendError(ws, 'Token required for authentication');
        }
        await this.authenticateClient(ws, message.token);
        break;
      }

      case 'workspace.subscribe': {
        if (!data.user) {
          return this.sendError(ws, 'Authentication required to subscribe to workspace');
        }
        const { workspaceId } = message;
        if (!workspaceId) {
          return this.sendError(ws, 'Workspace ID is required');
        }
        await this.subscribeWorkspace(ws, workspaceId);
        break;
      }

      case 'workspace.unsubscribe': {
        const { workspaceId } = message;
        if (workspaceId) {
          this.unsubscribeWorkspace(ws, workspaceId);
        }
        break;
      }

      case 'presence.update': {
        if (!data.user || !data.activeWorkspaceId) return;
        this.updatePresence(ws, message.currentResource);
        break;
      }

      case 'request.opened': {
        if (!data.user || !data.activeWorkspaceId) return;
        this.handleRequestOpened(ws, message.requestId, message.requestName);
        break;
      }

      case 'request.closed': {
        if (!data.user || !data.activeWorkspaceId) return;
        this.handleRequestClosed(ws, message.requestId);
        break;
      }

      case 'ping': {
        data.isAlive = true;
        this.send(ws, { type: 'pong' });
        break;
      }

      default:
        // Ignore unrecognized messages
        break;
    }
  }

  /**
   * Subscribe client to a workspace channel
   */
  async subscribeWorkspace(ws, workspaceId) {
    const clientData = this.clients.get(ws);
    if (!clientData || !clientData.user) {
      return this.sendError(ws, 'Authentication required to subscribe to workspace');
    }

    // Verify workspace membership server-side
    const membership = await workspaceRepository.findMembership(workspaceId, clientData.user.id);
    if (!membership) {
      return this.sendError(ws, 'Access denied: You are not a member of this workspace');
    }

    // If already subscribed to a different workspace, unsubscribe first
    if (clientData.activeWorkspaceId && clientData.activeWorkspaceId !== workspaceId) {
      this.unsubscribeWorkspace(ws, clientData.activeWorkspaceId);
    }

    clientData.activeWorkspaceId = workspaceId;

    if (!this.workspaceSubscriptions.has(workspaceId)) {
      this.workspaceSubscriptions.set(workspaceId, new Set());
    }
    this.workspaceSubscriptions.get(workspaceId).add(ws);

    // Initialize workspace presence map if missing
    if (!this.workspacePresence.has(workspaceId)) {
      this.workspacePresence.set(workspaceId, new Map());
    }

    const presenceMap = this.workspacePresence.get(workspaceId);
    presenceMap.set(clientData.user.id, {
      userId: clientData.user.id,
      displayName: clientData.user.name,
      email: clientData.user.email,
      lastSeen: new Date().toISOString(),
      currentResource: clientData.currentResource,
    });

    this.send(ws, {
      type: 'workspace.subscribed',
      workspaceId,
      role: membership.role,
    });

    // Broadcast updated presence to all members of this workspace
    this.broadcastPresence(workspaceId);
  }

  /**
   * Unsubscribe client from a workspace channel
   */
  unsubscribeWorkspace(ws, workspaceId) {
    const clientData = this.clients.get(ws);
    const subscribers = this.workspaceSubscriptions.get(workspaceId);
    if (subscribers) {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        this.workspaceSubscriptions.delete(workspaceId);
      }
    }

    if (clientData && clientData.activeWorkspaceId === workspaceId) {
      clientData.activeWorkspaceId = null;
      clientData.currentResource = null;

      // Remove presence if no other connection exists for this user in this workspace
      if (clientData.user) {
        const stillConnected = Array.from(subscribers || []).some(
          (otherWs) => this.clients.get(otherWs)?.user?.id === clientData.user.id
        );

        if (!stillConnected && this.workspacePresence.has(workspaceId)) {
          this.workspacePresence.get(workspaceId).delete(clientData.user.id);
          this.broadcastPresence(workspaceId);
        }
      }
    }
  }

  /**
   * Update client ephemeral presence resource
   */
  updatePresence(ws, currentResource) {
    const clientData = this.clients.get(ws);
    if (!clientData || !clientData.user || !clientData.activeWorkspaceId) return;

    const workspaceId = clientData.activeWorkspaceId;
    // Sanitize resource data: only allow type and resourceId/resourceName
    let sanitizedResource = null;
    if (currentResource && typeof currentResource === 'object') {
      sanitizedResource = {
        type: ['request', 'collection', 'canvas', 'browser'].includes(currentResource.type)
          ? currentResource.type
          : 'general',
        resourceId: currentResource.resourceId ? String(currentResource.resourceId) : null,
        resourceName: currentResource.resourceName ? String(currentResource.resourceName).slice(0, 100) : null,
      };
    }

    clientData.currentResource = sanitizedResource;

    const presenceMap = this.workspacePresence.get(workspaceId);
    if (presenceMap && presenceMap.has(clientData.user.id)) {
      const record = presenceMap.get(clientData.user.id);
      record.currentResource = sanitizedResource;
      record.lastSeen = new Date().toISOString();
      this.broadcastPresence(workspaceId);
    }
  }

  /**
   * Client opened a request
   */
  handleRequestOpened(ws, requestId, requestName) {
    if (!requestId) return;
    this.updatePresence(ws, {
      type: 'request',
      resourceId: requestId,
      resourceName: requestName || 'Request',
    });
  }

  /**
   * Client closed a request
   */
  handleRequestClosed(ws, requestId) {
    const clientData = this.clients.get(ws);
    if (!clientData) return;

    if (clientData.currentResource?.resourceId === requestId) {
      this.updatePresence(ws, null);
    }
  }

  /**
   * Broadcast current presence list for a workspace
   */
  broadcastPresence(workspaceId) {
    const presenceMap = this.workspacePresence.get(workspaceId);
    const presenceList = presenceMap ? Array.from(presenceMap.values()) : [];

    this.broadcastToWorkspace(workspaceId, {
      type: 'workspace.presence',
      workspaceId,
      presence: presenceList,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast event to all subscribers of a workspace
   * @param {string} workspaceId
   * @param {object} event
   * @param {string} [excludeUserId] - Optional user ID to skip echoing to
   */
  broadcastToWorkspace(workspaceId, event, excludeUserId = null) {
    const subscribers = this.workspaceSubscriptions.get(workspaceId);
    if (!subscribers || subscribers.size === 0) return;

    // Sanitize event payload to guarantee no secret or body leakage
    const sanitizedEvent = this.sanitizeEventPayload(event);
    const messageStr = JSON.stringify(sanitizedEvent);

    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        const clientData = this.clients.get(ws);
        if (excludeUserId && clientData?.user?.id === excludeUserId) {
          continue;
        }
        try {
          ws.send(messageStr);
        } catch {
          // Socket write failed, will be pruned on next heartbeat
        }
      }
    }
  }

  /**
   * Strictly sanitize event payloads before broadcasting
   */
  sanitizeEventPayload(event) {
    if (!event || typeof event !== 'object') return {};

    const {
      type,
      workspaceId,
      resourceId,
      actor,
      timestamp = new Date().toISOString(),
      metadata = {},
      ...rest
    } = event;

    // Filter metadata to forbid passwords, tokens, secrets, cookies, or bodies
    const sanitizedMetadata = {};
    if (metadata && typeof metadata === 'object') {
      const forbiddenKeys = [
        'password',
        'token',
        'secret',
        'authorization',
        'cookie',
        'set-cookie',
        'jwt',
        'body',
        'raw',
        'response',
        'headers',
      ];
      for (const [k, v] of Object.entries(metadata)) {
        if (!forbiddenKeys.includes(k.toLowerCase())) {
          sanitizedMetadata[k] = v;
        }
      }
    }

    return {
      type,
      workspaceId,
      resourceId: resourceId || null,
      actor: actor
        ? {
            id: actor.id,
            displayName: actor.name || actor.displayName || 'Teammate',
          }
        : null,
      timestamp,
      metadata: sanitizedMetadata,
      ...rest,
    };
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(ws) {
    const clientData = this.clients.get(ws);
    if (clientData?.activeWorkspaceId) {
      this.unsubscribeWorkspace(ws, clientData.activeWorkspaceId);
    }
    this.clients.delete(ws);
  }

  /**
   * Terminate a client immediately
   */
  terminateClient(ws) {
    try {
      ws.terminate();
    } catch {
      // Ignored
    }
    this.handleDisconnect(ws);
  }

  /**
   * Send JSON message to client
   */
  send(ws, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Send error message to client
   */
  sendError(ws, message) {
    this.send(ws, {
      type: 'error',
      message,
    });
  }

  /**
   * Parse raw cookie string into key-value map
   */
  parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach((cookie) => {
      let [name, ...rest] = cookie.split('=');
      name = name?.trim();
      if (!name) return;
      const value = rest.join('=').trim();
      list[name] = decodeURIComponent(value);
    });

    return list;
  }

  /**
   * Gracefully close WebSocket server and all connections
   */
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      for (const ws of this.clients.keys()) {
        try {
          ws.close();
        } catch {
          // Ignored
        }
      }
      this.clients.clear();
      this.workspaceSubscriptions.clear();
      this.workspacePresence.clear();

      this.wss.close();
      this.wss = null;
    }
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;

