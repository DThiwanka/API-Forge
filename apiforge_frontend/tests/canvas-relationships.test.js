import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeResourcePath,
  extractRequestProducedVariables,
  extractRequestConsumedVariables,
  isAuthVariable,
  inferRelationships,
  filterEdges,
} from '../src/features/canvas/utils/relationshipAnalyzer.js';
import { useCanvasStore } from '../src/features/canvas/store/canvasStore.js';
import { requestToNode } from '../src/features/canvas/utils/nodeHelpers.js';

describe('Step 48: API Relationship & Dependency Visualization', () => {
  beforeEach(() => {
    useCanvasStore.getState().resetCanvas();
  });

  describe('1. normalizeResourcePath', () => {
    it('handles empty, null, or non-string inputs safely', () => {
      assert.deepEqual(normalizeResourcePath(''), { resourceKey: '', canonicalPath: '', segments: [] });
      assert.deepEqual(normalizeResourcePath(null), { resourceKey: '', canonicalPath: '', segments: [] });
      assert.deepEqual(normalizeResourcePath(undefined), { resourceKey: '', canonicalPath: '', segments: [] });
      assert.deepEqual(normalizeResourcePath(1234), { resourceKey: '', canonicalPath: '', segments: [] });
    });

    it('strips query parameters and hash fragments', () => {
      const result = normalizeResourcePath('https://api.example.com/api/v1/users?page=1&limit=20#section');
      assert.equal(result.resourceKey, 'users');
      assert.equal(result.canonicalPath, 'api/v1/users');
    });

    it('strips environment variable prefixes like {{baseUrl}}', () => {
      const result = normalizeResourcePath('{{baseUrl}}/api/v1/products/456/details');
      assert.equal(result.resourceKey, 'products');
      assert.equal(result.canonicalPath, 'api/v1/products/:id/details');
    });

    it('canonicalizes path parameters (:id, {id}, numeric IDs, UUIDs, Mongo ObjectIDs)', () => {
      // Named path parameter
      const r1 = normalizeResourcePath('/users/:userId/profile');
      assert.equal(r1.canonicalPath, 'users/:id/profile');

      // OpenAPI style {id}
      const r2 = normalizeResourcePath('/users/{id}/settings');
      assert.equal(r2.canonicalPath, 'users/:id/settings');

      // Numeric ID
      const r3 = normalizeResourcePath('/orders/987654');
      assert.equal(r3.canonicalPath, 'orders/:id');

      // UUID
      const r4 = normalizeResourcePath('/teams/123e4567-e89b-12d3-a456-426614174000/members');
      assert.equal(r4.canonicalPath, 'teams/:id/members');

      // Mongo 24-char ObjectID
      const r5 = normalizeResourcePath('/items/507f1f77bcf86cd799439011');
      assert.equal(r5.canonicalPath, 'items/:id');
    });

    it('identifies primary resource key skipping generic API prefixes (api, v1, v2, rest)', () => {
      assert.equal(normalizeResourcePath('/api/v2/customers/:id').resourceKey, 'customers');
      assert.equal(normalizeResourcePath('/rest/v1/orders').resourceKey, 'orders');
      assert.equal(normalizeResourcePath('/auth/login').resourceKey, 'auth');
      assert.equal(normalizeResourcePath('/users').resourceKey, 'users');
    });
  });

  describe('2. Variable Extraction (Produced & Consumed)', () => {
    it('extracts variables produced via request.settings.extract', () => {
      const request = {
        name: 'Login Request',
        settings: {
          extract: [
            { variableName: 'authToken', source: 'body', propertyPath: 'token' },
            { variableName: 'userId', source: 'body', propertyPath: 'user.id' },
          ],
        },
      };

      const produced = extractRequestProducedVariables(request);
      assert.deepEqual(produced.sort(), ['authToken', 'userId']);
    });

    it('infers auth token output for POST login endpoints without explicit rules', () => {
      const request = {
        name: 'User Login',
        method: 'POST',
        url: '{{baseUrl}}/auth/login',
      };

      const produced = extractRequestProducedVariables(request);
      assert.ok(produced.includes('token') || produced.includes('authToken'));
    });

    it('extracts consumed variables from URL, query params, headers, auth, and body', () => {
      const request = {
        url: '{{baseUrl}}/api/users/{{userId}}',
        params: [{ key: 'filter', value: '{{filterTag}}' }],
        headers: [{ key: 'X-Tenant', value: '{{tenantId}}' }],
        auth: {
          bearer: { token: '{{authToken}}' },
        },
        body: {
          raw: JSON.stringify({ note: '{{noteContent}}' }),
        },
      };

      const consumed = extractRequestConsumedVariables(request);
      // Host variable {{baseUrl}} should be filtered out
      assert.ok(!consumed.includes('baseUrl'));
      assert.ok(consumed.includes('userId'));
      assert.ok(consumed.includes('filterTag'));
      assert.ok(consumed.includes('tenantId'));
      assert.ok(consumed.includes('authToken'));
      assert.ok(consumed.includes('noteContent'));
    });

    it('identifies auth variables correctly', () => {
      assert.equal(isAuthVariable('authToken'), true);
      assert.equal(isAuthVariable('access_token'), true);
      assert.equal(isAuthVariable('token'), true);
      assert.equal(isAuthVariable('jwt'), true);
      assert.equal(isAuthVariable('userId'), false);
      assert.equal(isAuthVariable('pageLimit'), false);
    });
  });

  describe('3. Relationship Inference Engine', () => {
    it('returns empty array when nodes count is less than 2', () => {
      assert.deepEqual(inferRelationships([]), []);
      assert.deepEqual(inferRelationships([requestToNode({ id: '1', name: 'Req 1' })]), []);
    });

    it('infers variable dependency edge from producer to consumer', () => {
      const producerNode = requestToNode({
        id: 'req-producer',
        name: 'Get User ID',
        method: 'GET',
        url: '{{baseUrl}}/users/current',
        settings: {
          extract: [{ variableName: 'activeUserId' }],
        },
      });

      const consumerNode = requestToNode({
        id: 'req-consumer',
        name: 'Get Orders for User',
        method: 'GET',
        url: '{{baseUrl}}/orders?userId={{activeUserId}}',
      });

      const edges = inferRelationships([producerNode, consumerNode]);
      assert.equal(edges.length, 1);
      const edge = edges[0];

      assert.equal(edge.source, 'req-producer');
      assert.equal(edge.target, 'req-consumer');
      assert.equal(edge.data.relationshipType, 'VARIABLE');
      assert.ok(edge.data.variableNames.includes('activeUserId'));
      assert.equal(edge.data.isInferred, true);
    });

    it('infers authentication dependency edge from login to bearer request', () => {
      const loginNode = requestToNode({
        id: 'req-login',
        name: 'Admin Login',
        method: 'POST',
        url: '{{baseUrl}}/auth/login',
        settings: {
          extract: [{ variableName: 'authToken' }],
        },
      });

      const securedNode = requestToNode({
        id: 'req-secured',
        name: 'Get Admin Settings',
        method: 'GET',
        url: '{{baseUrl}}/admin/settings',
        auth: {
          bearer: { token: '{{authToken}}' },
        },
      });

      const edges = inferRelationships([loginNode, securedNode]);
      assert.equal(edges.length, 1);
      const edge = edges[0];

      assert.equal(edge.source, 'req-login');
      assert.equal(edge.target, 'req-secured');
      assert.equal(edge.data.relationshipType, 'AUTH');
      assert.equal(edge.data.isInferred, true);
      assert.equal(edge.animated, true);
    });

    it('infers shared resource edge between requests operating on the same canonical resource', () => {
      const listUsers = requestToNode({
        id: 'req-users-list',
        name: 'List Users',
        method: 'GET',
        url: '{{baseUrl}}/api/v1/users',
      });

      const getUserById = requestToNode({
        id: 'req-users-get',
        name: 'Get User By ID',
        method: 'GET',
        url: '{{baseUrl}}/api/v1/users/:id',
      });

      const deleteUser = requestToNode({
        id: 'req-users-delete',
        name: 'Delete User',
        method: 'DELETE',
        url: '{{baseUrl}}/api/v1/users/12345',
      });

      const edges = inferRelationships([listUsers, getUserById, deleteUser]);
      // Anchor should be listUsers, connecting to getUserById and deleteUser
      assert.equal(edges.length, 2);
      for (const e of edges) {
        assert.equal(e.data.relationshipType, 'RESOURCE');
        assert.equal(e.data.resourceKey, 'users');
        assert.equal(e.source, 'req-users-list');
      }
    });

    it('never creates self-directed loops', () => {
      const node = requestToNode({
        id: 'req-loop',
        name: 'Self Dependent',
        method: 'POST',
        url: '{{baseUrl}}/users/{{id}}',
        settings: {
          extract: [{ variableName: 'id' }],
        },
      });

      const edges = inferRelationships([node]);
      assert.equal(edges.length, 0);
    });
  });

  describe('4. Relationship Filtering', () => {
    const testEdges = [
      {
        id: 'e-explicit-1',
        source: 'a',
        target: 'b',
        data: { isInferred: false, relationshipType: 'EXPLICIT' },
      },
      {
        id: 'inferred-auth-1',
        source: 'login',
        target: 'a',
        data: { isInferred: true, relationshipType: 'AUTH' },
      },
      {
        id: 'inferred-var-1',
        source: 'a',
        target: 'c',
        data: { isInferred: true, relationshipType: 'VARIABLE' },
      },
      {
        id: 'inferred-res-1',
        source: 'a',
        target: 'd',
        data: { isInferred: true, relationshipType: 'RESOURCE' },
      },
    ];

    it('filters "all" to return all edges matching enabled types', () => {
      const result = filterEdges(testEdges, 'all', { resource: true, variable: true, auth: true });
      assert.equal(result.length, 4);
    });

    it('filters "explicit" to return only explicit connections', () => {
      const result = filterEdges(testEdges, 'explicit');
      assert.equal(result.length, 1);
      assert.equal(result[0].id, 'e-explicit-1');
    });

    it('filters "inferred" to return only inferred dependencies', () => {
      const result = filterEdges(testEdges, 'inferred', { resource: true, variable: true, auth: true });
      assert.equal(result.length, 3);
      assert.ok(result.every((e) => e.data.isInferred));
    });

    it('filters "none" to hide all edges', () => {
      const result = filterEdges(testEdges, 'none');
      assert.equal(result.length, 0);
    });

    it('respects sub-type filters for inferred dependencies', () => {
      // Disable resource and variable, keep auth
      const result = filterEdges(testEdges, 'all', { resource: false, variable: false, auth: true });
      assert.equal(result.length, 2); // 1 explicit + 1 auth
      assert.ok(result.some((e) => e.id === 'e-explicit-1'));
      assert.ok(result.some((e) => e.id === 'inferred-auth-1'));
    });
  });

  describe('5. Canvas Store Relationship Actions', () => {
    it('sets relationship filter and toggles inferred types', () => {
      const store = useCanvasStore.getState();
      assert.equal(store.relationshipFilter, 'all');

      store.setRelationshipFilter('explicit');
      assert.equal(useCanvasStore.getState().relationshipFilter, 'explicit');

      store.toggleInferredTypeFilter('resource');
      assert.equal(useCanvasStore.getState().inferredTypeFilters.resource, false);
    });

    it('toggles legend visibility', () => {
      const store = useCanvasStore.getState();
      assert.equal(store.isLegendOpen, false);

      store.toggleLegend();
      assert.equal(useCanvasStore.getState().isLegendOpen, true);

      store.setIsLegendOpen(false);
      assert.equal(useCanvasStore.getState().isLegendOpen, false);
    });

    it('promotes an inferred relationship to a permanent explicit edge', () => {
      const store = useCanvasStore.getState();
      const inferredEdge = {
        id: 'inferred-req1-req2-var',
        source: 'req-1',
        target: 'req-2',
        data: {
          isInferred: true,
          relationshipType: 'VARIABLE',
          label: '{{token}}',
          sourceName: 'Login',
          targetName: 'Get Profile',
        },
      };

      store.setSelectedRelationship(inferredEdge);
      assert.equal(useCanvasStore.getState().selectedRelationship.id, 'inferred-req1-req2-var');

      store.promoteInferredToExplicit('inferred-req1-req2-var');

      const edges = useCanvasStore.getState().edges;
      assert.equal(edges.length, 1);
      assert.equal(edges[0].id, 'e-req-1-req-2');
      assert.equal(edges[0].source, 'req-1');
      assert.equal(edges[0].target, 'req-2');
      assert.equal(edges[0].data.isInferred, false);
      assert.equal(useCanvasStore.getState().selectedRelationship, null);
    });
  });
});

