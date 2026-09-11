import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';
import {
  parseDocument,
  mockJsonFromSchema,
  generateImportPlan,
  importOpenApi,
} from '../src/services/import-export/openapi-import.service.js';

describe('OpenAPI Import Integration & Unit Tests', () => {
  let appServer;
  let baseUrl;

  let ownerUser;
  let ownerToken;

  let memberUser;
  let memberToken;

  let viewerUser;
  let viewerToken;

  let strangerUser;
  let strangerToken;

  let workspaceId;
  let collectionId;

  async function registerUser(email, name = 'OpenAPI Test User') {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Password123!',
        name,
      }),
    });
    const body = await res.json();
    return { user: body.data.user, token: body.data.accessToken };
  }

  async function createWorkspace(token, name) {
    const res = await fetch(`${baseUrl}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    const body = await res.json();
    return body.data.workspace;
  }

  async function addWorkspaceMember(token, wsId, userId, role) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: wsId,
        userId,
        role,
      },
    });
  }

  before(async () => {
    // Start server on dynamic port
    await new Promise((resolve) => {
      appServer = app.listen(0, () => {
        const port = appServer.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    const timestamp = Date.now();
    const ownerRes = await registerUser(`oapi-owner-${timestamp}@example.com`, 'Owner');
    ownerUser = ownerRes.user;
    ownerToken = ownerRes.token;

    const memberRes = await registerUser(`oapi-member-${timestamp}@example.com`, 'Member');
    memberUser = memberRes.user;
    memberToken = memberRes.token;

    const viewerRes = await registerUser(`oapi-viewer-${timestamp}@example.com`, 'Viewer');
    viewerUser = viewerRes.user;
    viewerToken = viewerRes.token;

    const strangerRes = await registerUser(`oapi-stranger-${timestamp}@example.com`, 'Stranger');
    strangerUser = strangerRes.user;
    strangerToken = strangerRes.token;

    const ws = await createWorkspace(ownerToken, `OpenAPI Test WS ${timestamp}`);
    workspaceId = ws.id;

    await addWorkspaceMember(ownerToken, workspaceId, memberUser.id, WORKSPACE_ROLES.MEMBER);
    await addWorkspaceMember(ownerToken, workspaceId, viewerUser.id, WORKSPACE_ROLES.VIEWER);

    const col = await prisma.collection.create({
      data: {
        workspaceId,
        name: 'Existing Collection',
        position: 0,
      },
    });
    collectionId = col.id;
  });

  after(async () => {
    if (workspaceId) {
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerUser.email, memberUser.email, viewerUser.email, strangerUser.email],
        },
      },
    });

    await new Promise((resolve) => appServer.close(resolve));
  });

  // ==========================================
  // 1. UNIT TESTS: Document Parsing & Schema Mocking
  // ==========================================
  describe('Document Parsing & Mocking Unit Tests', () => {
    it('should parse valid JSON document', () => {
      const parsed = parseDocument('{"openapi": "3.0.0", "info": {"title": "Test"}}');
      assert.equal(parsed.openapi, '3.0.0');
      assert.equal(parsed.info.title, 'Test');
    });

    it('should parse valid YAML document', () => {
      const yamlStr = `
openapi: "3.1.0"
info:
  title: "YAML Test"
  version: "2.0.0"
`;
      const parsed = parseDocument(yamlStr);
      assert.equal(parsed.openapi, '3.1.0');
      assert.equal(parsed.info.title, 'YAML Test');
    });

    it('should reject empty document input', () => {
      assert.throws(() => parseDocument('   '), {
        name: 'AppError',
        message: /cannot be empty/,
      });
    });

    it('should reject malformed JSON and YAML', () => {
      assert.throws(() => parseDocument('{"invalid json: true'), {
        name: 'AppError',
        message: /Failed to parse OpenAPI document/,
      });
    });

    it('should reject oversized document', () => {
      const hugeString = 'a'.repeat(5000001);
      assert.throws(() => parseDocument(hugeString), {
        name: 'AppError',
        message: /exceeds maximum allowed size/,
      });
    });

    it('should generate type-safe mock JSON from schema', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer' },
          active: { type: 'boolean' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      };

      const mock = mockJsonFromSchema(schema);
      assert.equal(mock.id, '00000000-0000-0000-0000-000000000000');
      assert.equal(mock.email, 'user@example.com');
      assert.equal(mock.age, 0);
      assert.equal(mock.active, false);
      assert.deepEqual(mock.tags, ['']);
      assert.equal(mock.status, 'active');
    });

    it('should respect schema example or default over type mock', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Widget Pro' },
          count: { type: 'integer', default: 42 },
        },
      };
      const mock = mockJsonFromSchema(schema);
      assert.equal(mock.name, 'Widget Pro');
      assert.equal(mock.count, 42);
    });

    it('should prevent recursion past max depth 5', () => {
      let current = { type: 'object', properties: {} };
      const root = current;
      for (let i = 0; i < 8; i++) {
        const next = { type: 'object', properties: {} };
        current.properties.child = next;
        current = next;
      }
      const mock = mockJsonFromSchema(root);
      assert.ok(mock);
      // Ensure it terminates safely without infinite loop or exceeding depth
      assert.ok(mock.child.child.child.child.child);
    });
  });

  // ==========================================
  // 2. SPECIFICATION TRANSFORMATION TESTS
  // ==========================================
  describe('OpenAPI Plan Generation', () => {
    it('should parse OpenAPI 3.0 specification with all HTTP operations', async () => {
      const spec = {
        openapi: '3.0.3',
        info: {
          title: 'Methods API',
          version: '1.0.0',
          description: 'Tests all standard HTTP operations',
        },
        servers: [{ url: 'https://api.example.com/v1' }],
        paths: {
          '/items': {
            get: { operationId: 'getItems', summary: 'List items' },
            post: { operationId: 'createItem', summary: 'Create item' },
          },
          '/items/{id}': {
            put: { operationId: 'updateItem', summary: 'Update item' },
            patch: { operationId: 'patchItem', summary: 'Patch item' },
            delete: { operationId: 'deleteItem', summary: 'Delete item' },
            head: { operationId: 'headItem', summary: 'Head item' },
            options: { operationId: 'optionsItem', summary: 'Options item' },
          },
        },
      };

      const plan = await generateImportPlan(spec);
      assert.equal(plan.metadata.title, 'Methods API');
      assert.equal(plan.metadata.totalOperations, 7);
      assert.equal(plan.requests.length, 7);

      const methods = plan.requests.map((r) => r.method);
      assert.ok(methods.includes('GET'));
      assert.ok(methods.includes('POST'));
      assert.ok(methods.includes('PUT'));
      assert.ok(methods.includes('PATCH'));
      assert.ok(methods.includes('DELETE'));
      assert.ok(methods.includes('HEAD'));
      assert.ok(methods.includes('OPTIONS'));
    });

    it('should parse OpenAPI 3.1 YAML document with servers and tags', async () => {
      const yamlDoc = `
openapi: 3.1.0
info:
  title: Petstore 3.1
  version: 1.0.0
servers:
  - url: https://petstore.swagger.io/v2
    description: Primary
  - url: https://staging.petstore.swagger.io/v2
    description: Staging
paths:
  /pets:
    get:
      summary: Find pets
      tags:
        - Pets
      parameters:
        - name: status
          in: query
          schema:
            type: string
            default: available
      responses:
        '200':
          description: successful operation
  /orders:
    post:
      summary: Place order
      tags:
        - Orders
      responses:
        '200':
          description: order placed
`;

      const plan = await generateImportPlan(yamlDoc);
      assert.equal(plan.metadata.openApiVersion, '3.1.0');
      assert.equal(plan.metadata.title, 'Petstore 3.1');
      assert.equal(plan.servers.length, 2);
      assert.equal(plan.variables[0].key, 'baseUrl');
      assert.equal(plan.variables[0].value, 'https://petstore.swagger.io/v2');
      assert.equal(plan.folders.length, 2);

      const petReq = plan.requests.find((r) => r.name === 'Find pets');
      assert.ok(petReq);
      assert.equal(petReq.folderName, 'Pets');
      assert.equal(petReq.url, '{{baseUrl}}/pets');
      assert.equal(petReq.queryParams[0].key, 'status');
      assert.equal(petReq.queryParams[0].value, 'available');
    });

    it('should map security schemes: Bearer, Basic, APIKey and handle operation overrides', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Auth API', version: '1.0' },
        servers: [{ url: 'https://api.auth.com' }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer' },
            basicAuth: { type: 'http', scheme: 'basic' },
            headerApiKey: { type: 'apiKey', in: 'header', name: 'X-API-KEY' },
            queryApiKey: { type: 'apiKey', in: 'query', name: 'api_token' },
            oauthScheme: { type: 'oauth2' },
          },
        },
        security: [{ bearerAuth: [] }],
        paths: {
          '/secure/default': {
            get: { summary: 'Uses global Bearer' },
          },
          '/secure/basic': {
            get: {
              summary: 'Uses Basic',
              security: [{ basicAuth: [] }],
            },
          },
          '/secure/header-key': {
            get: {
              summary: 'Uses Header Key',
              security: [{ headerApiKey: [] }],
            },
          },
          '/secure/query-key': {
            get: {
              summary: 'Uses Query Key',
              security: [{ queryApiKey: [] }],
            },
          },
          '/public': {
            get: {
              summary: 'Public endpoint',
              security: [], // empty security overrides global
            },
          },
        },
      };

      const plan = await generateImportPlan(spec);

      const defaultReq = plan.requests.find((r) => r.name === 'Uses global Bearer');
      assert.equal(defaultReq.auth.type, 'bearer');
      assert.equal(defaultReq.auth.bearer.token, '{{token}}');

      const basicReq = plan.requests.find((r) => r.name === 'Uses Basic');
      assert.equal(basicReq.auth.type, 'basic');
      assert.equal(basicReq.auth.basic.username, '{{username}}');

      const headerKeyReq = plan.requests.find((r) => r.name === 'Uses Header Key');
      assert.equal(headerKeyReq.auth.type, 'api-key');
      assert.equal(headerKeyReq.auth.apiKey.addTo, 'header');
      assert.equal(headerKeyReq.auth.apiKey.key, 'X-API-KEY');

      const queryKeyReq = plan.requests.find((r) => r.name === 'Uses Query Key');
      assert.equal(queryKeyReq.auth.type, 'api-key');
      assert.equal(queryKeyReq.auth.apiKey.addTo, 'query');
      assert.equal(queryKeyReq.auth.apiKey.key, 'api_token');

      const publicReq = plan.requests.find((r) => r.name === 'Public endpoint');
      assert.equal(publicReq.auth.type, 'none');

      // Check OAuth warning emitted
      assert.ok(plan.warnings.some((w) => w.includes('OAuth2')));
    });

    it('should resolve local $ref references in schemas and parameters', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Ref API', version: '1.0' },
        paths: {
          '/users/{userId}': {
            parameters: [
              { $ref: '#/components/parameters/UserIdParam' },
            ],
            get: {
              summary: 'Get user by ID',
              responses: {
                '200': {
                  description: 'User response',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          parameters: {
            UserIdParam: {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string', example: 'usr_123' },
            },
          },
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string', example: 'John' },
              },
            },
          },
        },
      };

      const plan = await generateImportPlan(spec);
      assert.equal(plan.requests.length, 1);
      const req = plan.requests[0];
      assert.equal(req.url, '{{baseUrl}}/users/{userId}');
    });

    it('should reject external $ref references targeting remote URLs', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'SSRF Attack API', version: '1.0' },
        paths: {
          '/evil': {
            get: {
              summary: 'Evil',
              responses: {
                '200': {
                  description: 'Evil response',
                  content: {
                    'application/json': {
                      schema: { $ref: 'https://169.254.169.254/latest/meta-data' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      await assert.rejects(
        () => generateImportPlan(spec),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('External references') || err.message.includes('reference resolution error'));
          return true;
        }
      );
    });

    it('should reject Swagger 2.0 specifications with helpful message', async () => {
      const swaggerDoc = {
        swagger: '2.0',
        info: { title: 'Legacy Swagger', version: '1.0' },
        paths: {},
      };

      await assert.rejects(
        () => generateImportPlan(swaggerDoc),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('Swagger 2.0 is not supported'));
          return true;
        }
      );
    });
  });

  // ==========================================
  // 3. HTTP PREVIEW ENDPOINT TESTS
  // ==========================================
  describe('POST /api/workspaces/:workspaceId/import/openapi/preview', () => {
    it('should preview valid OpenAPI specification without writing to database', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Preview Petstore', version: '1.0.0' },
        servers: [{ url: 'https://petstore.example.com' }],
        paths: {
          '/pets': {
            get: { summary: 'List pets' },
          },
        },
      };

      const countBefore = await prisma.request.count({
        where: { collection: { workspaceId } },
      });

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ document: spec }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.metadata.title, 'Preview Petstore');
      assert.equal(json.data.requests.length, 1);
      assert.equal(json.data.requests[0].name, 'List pets');

      // Verify ZERO database mutations
      const countAfter = await prisma.request.count({
        where: { collection: { workspaceId } },
      });
      assert.equal(countBefore, countAfter);
    });

    it('should allow VIEWER to preview specification', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Viewer Spec', version: '1.0.0' },
        paths: { '/ping': { get: { summary: 'Ping' } } },
      };

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ document: spec }),
      });

      assert.equal(res.status, 200);
    });

    it('should reject stranger from previewing with 403', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({ document: { openapi: '3.0.0', info: { title: 'X', version: '1' }, paths: {} } }),
      });

      assert.equal(res.status, 403);
    });

    it('should reject invalid / empty document in preview with 400', async () => {
      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ document: '' }),
      });

      assert.equal(res.status, 400);
    });
  });

  // ==========================================
  // 4. HTTP SAVE / IMPORT ENDPOINT TESTS
  // ==========================================
  describe('POST /api/workspaces/:workspaceId/import/openapi', () => {
    it('should import specification into a newly created collection with tag folders', async () => {
      const yamlSpec = `
openapi: 3.0.3
info:
  title: Store API
  version: 1.2.0
  description: Store inventory and orders
servers:
  - url: https://store.example.com/api
paths:
  /products:
    get:
      summary: List Products
      tags:
        - Products
  /products/{id}:
    get:
      summary: Get Product
      tags:
        - Products
  /orders:
    post:
      summary: Place Order
      tags:
        - Orders
  /health:
    get:
      summary: Health Check
`;

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ document: yamlSpec }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.collection.name, 'Store API');
      assert.equal(json.data.folderCount, 2); // Products, Orders
      assert.equal(json.data.requestCount, 4);

      // Verify in DB
      const createdCol = await prisma.collection.findUnique({
        where: { id: json.data.collection.id },
        include: {
          folders: true,
          requests: true,
        },
      });

      assert.ok(createdCol);
      assert.equal(createdCol.name, 'Store API');
      assert.equal(createdCol.folders.length, 2);
      assert.equal(createdCol.requests.length, 4);

      // Check deterministic positioning
      const positions = createdCol.requests.map((r) => r.position).sort((a, b) => a - b);
      assert.deepEqual(positions, [0, 1, 2, 3]);

      // Check untagged request placed at collection root
      const healthReq = createdCol.requests.find((r) => r.name === 'Health Check');
      assert.equal(healthReq.folderId, null);
    });

    it('should deduplicate request names when duplicate summaries exist in spec', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Duplicates Spec', version: '1.0' },
        paths: {
          '/v1/user': { get: { summary: 'Get User' } },
          '/v2/user': { get: { summary: 'Get User' } },
          '/v3/user': { get: { summary: 'Get User' } },
        },
      };

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ document: spec }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.data.requestCount, 3);

      const requests = await prisma.request.findMany({
        where: { collectionId: json.data.collection.id },
        orderBy: { position: 'asc' },
      });

      assert.equal(requests[0].name, 'Get User');
      assert.equal(requests[1].name, 'Get User (2)');
      assert.equal(requests[2].name, 'Get User (3)');
    });

    it('should import into an existing collection when collectionId is provided', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Existing Target', version: '1.0' },
        paths: {
          '/ping': { get: { summary: 'Ping Service' } },
        },
      };

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          document: spec,
          collectionId,
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.data.collection.id, collectionId);

      const req = await prisma.request.findFirst({
        where: { collectionId, name: 'Ping Service' },
      });
      assert.ok(req);
    });

    it('should selectively import only requested operations when selectedOperations is provided', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Selective API', version: '1.0' },
        paths: {
          '/users': {
            get: { summary: 'List Users', tags: ['Users'] },
            post: { summary: 'Create User', tags: ['Users'] },
          },
          '/orders': {
            get: { summary: 'List Orders', tags: ['Orders'] },
          },
        },
      };

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({
          document: spec,
          selectedOperations: ['GET:{{baseUrl}}/users'],
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.data.requestCount, 1);
      assert.equal(json.data.folderCount, 1);

      const requests = await prisma.request.findMany({
        where: { collectionId: json.data.collection.id },
      });
      assert.equal(requests.length, 1);
      assert.equal(requests[0].name, 'List Users');
    });

    it('should reject VIEWER from importing with 403', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Viewer Import', version: '1.0' },
        paths: {},
      };

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ document: spec }),
      });

      assert.equal(res.status, 403);
    });

    it('should reject stranger from importing with 403', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Stranger Import', version: '1.0' },
        paths: {},
      };

      const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${strangerToken}`,
        },
        body: JSON.stringify({ document: spec }),
      });

      assert.equal(res.status, 403);
    });
  });
});
