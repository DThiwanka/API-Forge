import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocket } from 'ws';
import { realtimeService } from '../src/services/realtime/realtime.service.js';
import tokenService from '../src/services/auth/token.service.js';
import userRepository from '../src/repositories/user.repository.js';
import workspaceRepository from '../src/repositories/workspace.repository.js';

describe('Real-Time Collaboration Service Tests', () => {
  let server;
  let port;
  let mockUserAlice;
  let mockUserBob;
  let mockUserStranger;
  let tokenAlice;
  let tokenBob;
  let tokenStranger;
  const workspaceAId = 'ws-test-a-123';
  const workspaceBId = 'ws-test-b-456';

  // Helper to connect a WebSocket client with buffered message queue
  function createWsClient(queryParams = '') {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws${queryParams}`);
      const queue = [];
      const listeners = new Set();

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          for (const listener of listeners) {
            listener(parsed);
          }
          queue.push(parsed);
        } catch {
          // ignore
        }
      });

      ws.waitFor = (type, timeoutMs = 2000) => {
        const idx = queue.findIndex((m) => m.type === type);
        if (idx !== -1) {
          const [found] = queue.splice(idx, 1);
          return Promise.resolve(found);
        }
        return new Promise((res, rej) => {
          const timer = setTimeout(() => {
            listeners.delete(onMsg);
            rej(new Error(`Timeout waiting for message type "${type}"`));
          }, timeoutMs);

          const onMsg = (parsed) => {
            if (parsed.type === type) {
              clearTimeout(timer);
              listeners.delete(onMsg);
              res(parsed);
            }
          };
          listeners.add(onMsg);
        });
      };

      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  before(async () => {
    // Start HTTP server on ephemeral port
    server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('OK');
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    // Initialize realtime service on server
    realtimeService.init(server);

    // Mock users
    mockUserAlice = { id: 'u-alice-1', name: 'Alice', email: 'alice@example.com' };
    mockUserBob = { id: 'u-bob-2', name: 'Bob', email: 'bob@example.com' };
    mockUserStranger = { id: 'u-stranger-3', name: 'Stranger', email: 'stranger@example.com' };

    tokenAlice = tokenService.generateAccessToken(mockUserAlice);
    tokenBob = tokenService.generateAccessToken(mockUserBob);
    tokenStranger = tokenService.generateAccessToken(mockUserStranger);

    // Stub userRepository.findActiveById
    userRepository.findActiveById = async (id) => {
      if (id === mockUserAlice.id) return mockUserAlice;
      if (id === mockUserBob.id) return mockUserBob;
      if (id === mockUserStranger.id) return mockUserStranger;
      return null;
    };

    // Stub workspaceRepository.findMembership
    workspaceRepository.findMembership = async (wsId, userId) => {
      // Alice is in Workspace A and B
      if (userId === mockUserAlice.id) {
        return { id: 'm-alice', workspaceId: wsId, userId, role: 'OWNER' };
      }
      // Bob is only in Workspace A
      if (userId === mockUserBob.id && wsId === workspaceAId) {
        return { id: 'm-bob', workspaceId: wsId, userId, role: 'MEMBER' };
      }
      // Stranger is not in any workspace
      return null;
    };
  });

  after(async () => {
    realtimeService.close();
    await new Promise((resolve) => server.close(resolve));
  });

  describe('1. WebSocket Connection & Authentication', () => {
    it('connects with valid token in query param and confirms authentication', async () => {
      const ws = await createWsClient(`?token=${tokenAlice}`);
      const established = await ws.waitFor('connection.established');

      assert.equal(established.authenticated, true);
      assert.equal(established.user?.id, mockUserAlice.id);
      assert.equal(established.user?.name, mockUserAlice.name);

      ws.close();
    });

    it('connects unauthenticated and authenticates via auth message', async () => {
      const ws = await createWsClient();
      const established = await ws.waitFor('connection.established');
      assert.equal(established.authenticated, false);

      ws.send(JSON.stringify({ type: 'auth', token: tokenBob }));
      const authSuccess = await ws.waitFor('auth.success');
      assert.equal(authSuccess.user.id, mockUserBob.id);

      ws.close();
    });

    it('rejects invalid token in auth message', async () => {
      const ws = await createWsClient();
      ws.send(JSON.stringify({ type: 'auth', token: 'invalid-garbage-token' }));

      const authError = await ws.waitFor('auth.error');
      assert.ok(authError.message);

      ws.close();
    });
  });

  describe('2. Workspace Authorization & Channel Isolation', () => {
    it('allows a workspace member to subscribe to workspace channel', async () => {
      const ws = await createWsClient(`?token=${tokenAlice}`);
      await ws.waitFor('connection.established');

      ws.send(JSON.stringify({ type: 'workspace.subscribe', workspaceId: workspaceAId }));
      const subscribed = await ws.waitFor('workspace.subscribed');

      assert.equal(subscribed.workspaceId, workspaceAId);
      assert.equal(subscribed.role, 'OWNER');

      ws.close();
    });

    it('denies a non-member from subscribing to a private workspace', async () => {
      const ws = await createWsClient(`?token=${tokenStranger}`);
      await ws.waitFor('connection.established');

      ws.send(JSON.stringify({ type: 'workspace.subscribe', workspaceId: workspaceAId }));
      const errorMsg = await ws.waitFor('error');

      assert.ok(errorMsg.message.includes('Access denied'));

      ws.close();
    });

    it('ensures workspace A events do NOT reach clients in workspace B', async () => {
      // Alice subscribes to Workspace A
      const wsAlice = await createWsClient(`?token=${tokenAlice}`);
      wsAlice.send(JSON.stringify({ type: 'workspace.subscribe', workspaceId: workspaceAId }));
      await wsAlice.waitFor('workspace.subscribed');

      // Bob connects and subscribes to Workspace A
      const wsBob = await createWsClient(`?token=${tokenBob}`);
      wsBob.send(JSON.stringify({ type: 'workspace.subscribe', workspaceId: workspaceAId }));
      await wsBob.waitFor('workspace.subscribed');

      let bobReceivedWorkspaceAEvent = false;
      let bobReceivedWorkspaceBEvent = false;

      wsBob.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'test.event.a') bobReceivedWorkspaceAEvent = true;
        if (parsed.type === 'test.event.b') bobReceivedWorkspaceBEvent = true;
      });

      // Broadcast to Workspace A
      realtimeService.broadcastToWorkspace(workspaceAId, {
        type: 'test.event.a',
        workspaceId: workspaceAId,
      });

      // Broadcast to Workspace B
      realtimeService.broadcastToWorkspace(workspaceBId, {
        type: 'test.event.b',
        workspaceId: workspaceBId,
      });

      // Wait 100ms for events to propagate
      await new Promise((r) => setTimeout(r, 100));

      assert.equal(bobReceivedWorkspaceAEvent, true, 'Bob in Workspace A should receive Workspace A events');
      assert.equal(bobReceivedWorkspaceBEvent, false, 'Bob in Workspace A must NEVER receive Workspace B events');

      wsAlice.close();
      wsBob.close();
    });
  });

  describe('3. Ephemeral Presence & Request Viewing', () => {
    it('broadcasts presence update when member joins and updates location', async () => {
      const wsAlice = await createWsClient(`?token=${tokenAlice}`);
      wsAlice.send(JSON.stringify({ type: 'workspace.subscribe', workspaceId: workspaceAId }));
      await wsAlice.waitFor('workspace.subscribed');
      await wsAlice.waitFor('workspace.presence');

      // Alice sends request.opened
      wsAlice.send(
        JSON.stringify({
          type: 'request.opened',
          workspaceId: workspaceAId,
          requestId: 'req-123',
          requestName: 'Get Users API',
        })
      );

      const presenceMsg = await wsAlice.waitFor('workspace.presence');
      assert.ok(Array.isArray(presenceMsg.presence));
      const alicePresence = presenceMsg.presence.find((p) => p.userId === mockUserAlice.id);

      assert.ok(alicePresence);
      assert.equal(alicePresence.currentResource?.type, 'request');
      assert.equal(alicePresence.currentResource?.resourceId, 'req-123');
      assert.equal(alicePresence.currentResource?.resourceName, 'Get Users API');

      wsAlice.close();
    });
  });

  describe('4. Sanitization & Secret Redaction', () => {
    it('strips sensitive credentials, tokens, passwords, and bodies from broadcast events', async () => {
      const ws = await createWsClient(`?token=${tokenAlice}`);
      ws.send(JSON.stringify({ type: 'workspace.subscribe', workspaceId: workspaceAId }));
      await ws.waitFor('workspace.subscribed');

      const receivedPromise = ws.waitFor('request.updated');

      // Broadcast event with sensitive fields injected
      realtimeService.broadcastToWorkspace(workspaceAId, {
        type: 'request.updated',
        workspaceId: workspaceAId,
        resourceId: 'req-456',
        actor: { id: mockUserAlice.id, name: 'Alice' },
        metadata: {
          name: 'Updated API',
          token: 'SUPER_SECRET_TOKEN',
          password: 'SecretPassword123',
          authorization: 'Bearer secret',
          body: { raw: 'super secret json' },
          allowedField: 'safeValue',
        },
      });

      const event = await receivedPromise;

      assert.equal(event.metadata.allowedField, 'safeValue');
      assert.equal(event.metadata.name, 'Updated API');
      assert.equal(event.metadata.token, undefined, 'token must be stripped');
      assert.equal(event.metadata.password, undefined, 'password must be stripped');
      assert.equal(event.metadata.authorization, undefined, 'authorization must be stripped');
      assert.equal(event.metadata.body, undefined, 'body must be stripped');

      ws.close();
    });
  });
});
