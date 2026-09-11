import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import YAML from 'yaml';
import { validate } from '@readme/openapi-parser';

process.env.NODE_ENV = 'test';

import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { WORKSPACE_ROLES } from '../src/constants/workspaceRoles.js';
import {
  toCamelCase,
  sanitizePath,
  isSensitiveKey,
  buildParameters,
  buildRequestBody,
  buildSecurity,
  generateOpenApiDocument,
  serializeToJson,
  serializeToYaml,
  sanitizeFilename,
} from '../src/services/import-export/openapi-export.service.js';

describe('OpenAPI Export Integration & Unit Tests', () => {
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
  let otherWorkspaceId;

  async function registerUser(email, name = 'Export Test User') {
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

  before(async () => {
    await new Promise((resolve) => {
      appServer = app.listen(0, () => {
        const port = appServer.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    const timestamp = Date.now();
    const ownerRes = await registerUser(`exp-owner-${timestamp}@example.com`, 'Owner');
    ownerUser = ownerRes.user;
    ownerToken = ownerRes.token;

    const memberRes = await registerUser(`exp-member-${timestamp}@example.com`, 'Member');
    memberUser = memberRes.user;
    memberToken = memberRes.token;

    const viewerRes = await registerUser(`exp-viewer-${timestamp}@example.com`, 'Viewer');
    viewerUser = viewerRes.user;
    viewerToken = viewerRes.token;

    const strangerRes = await registerUser(`exp-stranger-${timestamp}@example.com`, 'Stranger');
    strangerUser = strangerRes.user;
    strangerToken = strangerRes.token;

    const ws = await createWorkspace(ownerToken, `Export Test WS ${timestamp}`);
    workspaceId = ws.id;

    const otherWs = await createWorkspace(ownerToken, `Other WS ${timestamp}`);
    otherWorkspaceId = otherWs.id;

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: memberUser.id,
        role: WORKSPACE_ROLES.MEMBER,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: viewerUser.id,
        role: WORKSPACE_ROLES.VIEWER,
      },
    });
  });

  after(async () => {
    if (workspaceId) {
      await prisma.workspace.deleteMany({
        where: { id: { in: [workspaceId, otherWorkspaceId] } },
      });
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
  // 1. UNIT TESTS FOR HELPER UTILITIES
  // ==========================================
  describe('Unit Tests: OpenAPI Export Helpers', () => {
    it('toCamelCase: should convert names to valid camelCase operation IDs', () => {
      assert.equal(toCamelCase('Get User'), 'getUser');
      assert.equal(toCamelCase('List all pets in store!'), 'listAllPetsInStore');
      assert.equal(toCamelCase('create_order_item'), 'createOrderItem');
      assert.equal(toCamelCase(''), '');
      assert.equal(toCamelCase('---'), '');
    });

    it('sanitizePath: should normalize URLs, extract origins, and convert variables to {param}', () => {
      const res1 = sanitizePath('https://api.example.com/v1/users?limit=10');
      assert.equal(res1.path, '/v1/users');
      assert.equal(res1.origin, 'https://api.example.com');
      assert.deepEqual(res1.pathParams, []);

      const res2 = sanitizePath('{{baseUrl}}/pets/{{petId}}/photos/{{photoId}}');
      assert.equal(res2.path, '/pets/{petId}/photos/{photoId}');
      assert.deepEqual(res2.pathParams, ['petId', 'photoId']);

      const res3 = sanitizePath('users/profile');
      assert.equal(res3.path, '/users/profile');
    });

    it('isSensitiveKey: should accurately detect sensitive headers and parameters', () => {
      assert.equal(isSensitiveKey('Authorization'), true);
      assert.equal(isSensitiveKey('authorization'), true);
      assert.equal(isSensitiveKey('X-API-Key'), true);
      assert.equal(isSensitiveKey('token'), true);
      assert.equal(isSensitiveKey('cookie'), true);
      assert.equal(isSensitiveKey('set-cookie'), true);
      assert.equal(isSensitiveKey('password'), true);
      assert.equal(isSensitiveKey('X-Request-Id'), false);
      assert.equal(isSensitiveKey('page'), false);
    });

    it('buildParameters: should map query, header, and path parameters safely', () => {
      const queryParams = [
        { key: 'page', value: '1', description: 'Page number' },
        { key: 'api_key', value: 'secret123', description: 'Secret API Key' },
        { key: 'disabledParam', value: 'foo', enabled: false },
      ];
      const headers = [
        { key: 'X-Correlation-ID', value: 'corr-123' },
        { key: 'Authorization', value: 'Bearer secret_token' },
        { key: 'Content-Type', value: 'application/json' },
      ];
      const pathParams = ['userId'];

      const params = buildParameters(queryParams, headers, pathParams);

      // Path param must exist and be required
      const pathParam = params.find((p) => p.in === 'path');
      assert.ok(pathParam);
      assert.equal(pathParam.name, 'userId');
      assert.equal(pathParam.required, true);

      // Query param page must have example
      const pageParam = params.find((p) => p.name === 'page');
      assert.ok(pageParam);
      assert.equal(pageParam.example, '1');

      // Sensitive query param api_key must NOT expose example value
      const apiKeyParam = params.find((p) => p.name === 'api_key');
      assert.ok(apiKeyParam);
      assert.equal(apiKeyParam.example, undefined);

      // Disabled query param must not exist
      assert.equal(params.some((p) => p.name === 'disabledParam'), false);

      // Safe header must exist
      const corrHeader = params.find((p) => p.name === 'X-Correlation-ID');
      assert.ok(corrHeader);
      assert.equal(corrHeader.in, 'header');

      // Sensitive / specification-managed headers must be excluded
      assert.equal(params.some((p) => p.name.toLowerCase() === 'authorization'), false);
      assert.equal(params.some((p) => p.name.toLowerCase() === 'content-type'), false);
    });

    it('buildRequestBody: should correctly map JSON, text, form-urlencoded, and multipart bodies', () => {
      // JSON
      const jsonBody = buildRequestBody({
        mode: 'json',
        json: '{"name": "Alice", "role": "admin"}',
      });
      assert.ok(jsonBody.content['application/json']);
      assert.deepEqual(jsonBody.content['application/json'].example, {
        name: 'Alice',
        role: 'admin',
      });

      // Text
      const textBody = buildRequestBody({
        mode: 'text',
        text: 'raw plain text',
      });
      assert.ok(textBody.content['text/plain']);
      assert.equal(textBody.content['text/plain'].example, 'raw plain text');

      // x-www-form-urlencoded
      const formUrlBody = buildRequestBody({
        mode: 'x-www-form-urlencoded',
        urlEncoded: [{ key: 'username', value: 'bob' }],
      });
      assert.ok(formUrlBody.content['application/x-www-form-urlencoded']);
      assert.ok(formUrlBody.content['application/x-www-form-urlencoded'].schema.properties.username);

      // form-data
      const formDataBody = buildRequestBody({
        mode: 'form-data',
        formData: [{ key: 'avatar', type: 'file' }, { key: 'desc', value: 'profile' }],
      });
      assert.ok(formDataBody.content['multipart/form-data']);
      assert.equal(formDataBody.content['multipart/form-data'].schema.properties.avatar.format, 'binary');

      // None
      assert.equal(buildRequestBody({ mode: 'none' }), null);
    });

    it('buildSecurity: should register schemes and return operation security without secrets', () => {
      const schemesMap = new Map();

      // Bearer
      const bearerSec = buildSecurity(
        { type: 'bearer', token: 'super-secret-token' },
        schemesMap
      );
      assert.deepEqual(bearerSec, [{ BearerAuth: [] }]);
      assert.deepEqual(schemesMap.get('BearerAuth'), {
        type: 'http',
        scheme: 'bearer',
      });

      // Basic
      const basicSec = buildSecurity(
        { type: 'basic', username: 'admin', password: 'secretpassword' },
        schemesMap
      );
      assert.deepEqual(basicSec, [{ BasicAuth: [] }]);
      assert.deepEqual(schemesMap.get('BasicAuth'), {
        type: 'http',
        scheme: 'basic',
      });

      // API Key header
      const apiKeySec = buildSecurity(
        { type: 'api-key', in: 'header', key: 'X-App-Key', value: 'secretkey' },
        schemesMap
      );
      assert.deepEqual(apiKeySec, [{ ApiKeyHeaderAuth: [] }]);
      assert.deepEqual(schemesMap.get('ApiKeyHeaderAuth'), {
        type: 'apiKey',
        in: 'header',
        name: 'X-App-Key',
      });

      // Check zero secret leakage in registered schemes
      const allSchemeJson = JSON.stringify(Object.fromEntries(schemesMap));
      assert.equal(allSchemeJson.includes('super-secret-token'), false);
      assert.equal(allSchemeJson.includes('secretpassword'), false);
      assert.equal(allSchemeJson.includes('secretkey'), false);
    });

    it('sanitizeFilename: should generate safe filenames for JSON and YAML', () => {
      assert.equal(sanitizeFilename('My Petstore API!', 'json'), 'my-petstore-api.openapi.json');
      assert.equal(sanitizeFilename('Payments & Billing / v2', 'yaml'), 'payments-billing-v2.openapi.yaml');
      assert.equal(sanitizeFilename('///', 'json'), 'api.openapi.json');
    });

    it('serializeToYaml: should serialize document cleanly into parseable YAML', () => {
      const doc = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };
      const yamlStr = serializeToYaml(doc);
      const parsed = YAML.parse(yamlStr);
      assert.deepEqual(parsed, doc);
    });
  });

  // ==========================================
  // 2. DOCUMENT GENERATION & SCHEMA VALIDATION
  // ==========================================
  describe('OpenAPI Document Generation & Validation', () => {
    it('should generate valid OpenAPI 3.0.3 specification for an empty collection', async () => {
      const collection = { name: 'Empty Collection', description: 'No requests here' };
      const { document, warnings } = await generateOpenApiDocument(collection, [], []);

      assert.equal(document.openapi, '3.0.3');
      assert.equal(document.info.title, 'Empty Collection');
      assert.equal(document.info.description, 'No requests here');
      assert.deepEqual(document.paths, {});
      assert.equal(warnings.length, 0);

      // Validate with openapi parser
      await validate(document);
    });

    it('should generate valid OpenAPI 3.0.3 with multiple methods and folder tags', async () => {
      const collection = { name: 'Store API' };
      const folders = [
        { id: 'f1', name: 'Products', description: 'Product endpoints' },
        { id: 'f2', name: 'Orders' },
      ];
      const requests = [
        {
          name: 'List Products',
          method: 'GET',
          url: 'https://store.example.com/products',
          folderId: 'f1',
          queryParams: [{ key: 'category', value: 'electronics' }],
        },
        {
          name: 'Create Product',
          method: 'POST',
          url: 'https://store.example.com/products',
          folderId: 'f1',
          body: {
            mode: 'json',
            json: JSON.stringify({ name: 'Headphones', price: 99.99 }),
          },
        },
        {
          name: 'Get Order',
          method: 'GET',
          url: 'https://store.example.com/orders/{{orderId}}',
          folderId: 'f2',
          auth: { type: 'bearer', token: 'my-bearer-token' },
        },
        {
          name: 'Health Check',
          method: 'GET',
          url: 'https://store.example.com/health',
          folderId: null, // Root-level request
        },
      ];

      const { document } = await generateOpenApiDocument(collection, folders, requests);

      assert.equal(document.openapi, '3.0.3');
      assert.equal(document.servers.length, 1);
      assert.equal(document.servers[0].url, 'https://store.example.com');
      assert.equal(document.tags.length, 2);

      // Check tags
      const productTag = document.tags.find((t) => t.name === 'Products');
      assert.ok(productTag);
      assert.equal(productTag.description, 'Product endpoints');

      // Check paths
      assert.ok(document.paths['/products']);
      assert.ok(document.paths['/products'].get);
      assert.ok(document.paths['/products'].post);
      assert.deepEqual(document.paths['/products'].get.tags, ['Products']);

      // Check path param
      assert.ok(document.paths['/orders/{orderId}']);
      const getOrder = document.paths['/orders/{orderId}'].get;
      assert.ok(getOrder);
      const pathParam = getOrder.parameters.find((p) => p.in === 'path');
      assert.equal(pathParam.name, 'orderId');
      assert.equal(pathParam.required, true);

      // Check root level request has no tags
      assert.ok(document.paths['/health'].get);
      assert.equal(document.paths['/health'].get.tags, undefined);

      // Check security scheme
      assert.ok(document.components.securitySchemes.BearerAuth);
      assert.equal(JSON.stringify(document).includes('my-bearer-token'), false);

      // Complete validation against official OpenAPI 3.0 specification
      await validate(document);
    });

    it('should disambiguate duplicate operation IDs and merge duplicate path+method operations', async () => {
      const collection = { name: 'Duplicates API' };
      const requests = [
        {
          name: 'Get User',
          method: 'GET',
          url: '/users/{{userId}}',
        },
        {
          name: 'Get User', // Duplicate name -> operationId getUser_2
          method: 'POST',
          url: '/users',
        },
        {
          name: 'Get User Alt', // Duplicate (GET, /users/{userId}) -> merged
          method: 'GET',
          url: '/users/{{userId}}',
        },
      ];

      const { document, warnings } = await generateOpenApiDocument(collection, [], requests);

      assert.ok(document.paths['/users/{userId}'].get);
      assert.equal(document.paths['/users/{userId}'].get.operationId, 'getUser');
      assert.equal(
        document.paths['/users/{userId}'].get.summary,
        'Get User / Get User Alt'
      );
      assert.equal(document.paths['/users'].post.operationId, 'getUser_2');
      assert.equal(warnings.length, 1);

      await validate(document);
    });
  });

  // ==========================================
  // 3. HTTP ENDPOINT TESTS
  // ==========================================
  describe('HTTP Endpoint: GET /api/workspaces/:workspaceId/collections/:collectionId/export/openapi', () => {
    let testCollectionId;

    before(async () => {
      // Create a test collection with folder and requests
      const col = await prisma.collection.create({
        data: {
          workspaceId,
          name: 'Pet Store API',
          description: 'A complete pet store collection for export tests',
          position: 0,
        },
      });
      testCollectionId = col.id;

      const folder = await prisma.folder.create({
        data: {
          collectionId: testCollectionId,
          name: 'Pets',
          position: 0,
        },
      });

      await prisma.request.create({
        data: {
          collectionId: testCollectionId,
          folderId: folder.id,
          name: 'Find Pets By Status',
          method: 'GET',
          url: '{{baseUrl}}/pets/findByStatus',
          queryParams: [
            { key: 'status', value: 'available', enabled: true, description: 'Pet status' },
          ],
          headers: [
            { key: 'X-Request-Trace', value: 'trace-456', enabled: true },
          ],
          position: 0,
        },
      });

      await prisma.request.create({
        data: {
          collectionId: testCollectionId,
          folderId: folder.id,
          name: 'Add a new Pet',
          method: 'POST',
          url: '{{baseUrl}}/pets',
          auth: {
            type: 'bearer',
            token: 'secret-auth-token-do-not-leak',
          },
          body: {
            mode: 'json',
            json: JSON.stringify({ name: 'Doggie', photoUrls: [] }),
          },
          position: 1,
        },
      });

      await prisma.request.create({
        data: {
          collectionId: testCollectionId,
          folderId: null, // root request
          name: 'Ping Health',
          method: 'GET',
          url: '{{baseUrl}}/health',
          position: 2,
        },
      });
    });

    it('should export collection as JSON when format=json (default)', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${testCollectionId}/export/openapi?format=json`,
        {
          headers: {
            Authorization: `Bearer ${memberToken}`,
          },
        }
      );

      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /application\/json/);
      assert.match(
        res.headers.get('content-disposition'),
        /attachment;\s*filename="pet-store-api\.openapi\.json"/
      );

      const jsonText = await res.text();
      const doc = JSON.parse(jsonText);

      assert.equal(doc.openapi, '3.0.3');
      assert.equal(doc.info.title, 'Pet Store API');
      assert.ok(doc.paths['/pets/findByStatus'].get);
      assert.ok(doc.paths['/pets'].post);
      assert.ok(doc.paths['/health'].get);

      // Verify zero secrets leaked
      assert.equal(jsonText.includes('secret-auth-token-do-not-leak'), false);

      // Validate with openapi parser
      await validate(doc);
    });

    it('should export collection as YAML when format=yaml', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${testCollectionId}/export/openapi?format=yaml`,
        {
          headers: {
            Authorization: `Bearer ${memberToken}`,
          },
        }
      );

      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type'), /application\/yaml/);
      assert.match(
        res.headers.get('content-disposition'),
        /attachment;\s*filename="pet-store-api\.openapi\.yaml"/
      );

      const yamlText = await res.text();
      const doc = YAML.parse(yamlText);

      assert.equal(doc.openapi, '3.0.3');
      assert.equal(doc.info.title, 'Pet Store API');
      assert.ok(doc.paths['/pets/findByStatus'].get);

      // Verify zero secrets leaked
      assert.equal(yamlText.includes('secret-auth-token-do-not-leak'), false);

      // Validate parsed YAML with openapi parser
      await validate(doc);
    });

    it('should allow VIEWER role to export collection', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${testCollectionId}/export/openapi`,
        {
          headers: {
            Authorization: `Bearer ${viewerToken}`,
          },
        }
      );

      assert.equal(res.status, 200);
    });

    it('should reject non-member (stranger) with 403', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${testCollectionId}/export/openapi`,
        {
          headers: {
            Authorization: `Bearer ${strangerToken}`,
          },
        }
      );

      assert.equal(res.status, 403);
    });

    it('should return 400 for unsupported format query parameter', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${testCollectionId}/export/openapi?format=xml`,
        {
          headers: {
            Authorization: `Bearer ${memberToken}`,
          },
        }
      );

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
    });

    it('should return 404 if collection belongs to a different workspace', async () => {
      const res = await fetch(
        `${baseUrl}/workspaces/${otherWorkspaceId}/collections/${testCollectionId}/export/openapi`,
        {
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
        }
      );

      assert.equal(res.status, 404);
    });
  });

  // ==========================================
  // 4. ROUND-TRIP INTEGRATION TEST
  // ==========================================
  describe('Round-Trip Integration: Import OpenAPI -> Save -> Export OpenAPI', () => {
    it('should preserve endpoints, parameters, body, auth, and tags across import and export', async () => {
      const initialSpec = `
openapi: 3.0.3
info:
  title: RoundTrip Store
  version: 1.0.0
  description: API for testing import-export cycle
servers:
  - url: https://api.roundtrip.example.com
paths:
  /inventory:
    get:
      summary: Get Inventory
      tags:
        - Warehouse
      parameters:
        - name: warehouseId
          in: query
          required: false
          schema:
            type: string
  /items:
    post:
      summary: Add Item
      tags:
        - Warehouse
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
            example:
              sku: SKU-12345
              quantity: 50
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
`;

      // 1. Import OpenAPI via Step 19 endpoint
      const importRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/import/openapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${memberToken}`,
        },
        body: JSON.stringify({ document: initialSpec }),
      });

      assert.equal(importRes.status, 201);
      const importJson = await importRes.json();
      const importedColId = importJson.data.collection.id;
      assert.ok(importedColId);

      // 2. Export the newly imported collection via Step 21 endpoint
      const exportRes = await fetch(
        `${baseUrl}/workspaces/${workspaceId}/collections/${importedColId}/export/openapi?format=json`,
        {
          headers: {
            Authorization: `Bearer ${memberToken}`,
          },
        }
      );

      assert.equal(exportRes.status, 200);
      const exportedDoc = await exportRes.json();

      // 3. Verify semantic round-trip integrity
      assert.equal(exportedDoc.openapi, '3.0.3');
      assert.equal(exportedDoc.info.title, 'RoundTrip Store');
      assert.equal(exportedDoc.info.description, 'API for testing import-export cycle');

      // Tags preserved
      const warehouseTag = exportedDoc.tags?.find((t) => t.name === 'Warehouse');
      assert.ok(warehouseTag);

      // GET /inventory preserved with query parameter
      const getInventory = exportedDoc.paths['/inventory']?.get;
      assert.ok(getInventory);
      assert.equal(getInventory.summary, 'Get Inventory');
      assert.deepEqual(getInventory.tags, ['Warehouse']);
      const queryParam = getInventory.parameters?.find((p) => p.name === 'warehouseId');
      assert.ok(queryParam);
      assert.equal(queryParam.in, 'query');

      // POST /items preserved with requestBody and BearerAuth
      const postItems = exportedDoc.paths['/items']?.post;
      assert.ok(postItems);
      assert.equal(postItems.summary, 'Add Item');
      assert.ok(postItems.requestBody?.content['application/json']);
      assert.deepEqual(postItems.requestBody.content['application/json'].example, {
        sku: 'SKU-12345',
        quantity: 50,
      });

      // BearerAuth preserved in components
      assert.ok(exportedDoc.components?.securitySchemes?.BearerAuth);
      assert.deepEqual(postItems.security, [{ BearerAuth: [] }]);

      // Complete validation against official OpenAPI 3.0 specification
      await validate(exportedDoc);
    });
  });
});
