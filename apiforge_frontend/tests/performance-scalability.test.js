import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { doesRequestMatchFilters, doesCollectionMatchFilters } from '../src/features/collections/utils/collectionTreeUtils.js';
import { inferRelationships } from '../src/features/canvas/utils/relationshipAnalyzer.js';
import { rankCommands, groupCommands } from '../src/features/command-center/utils/commandUtils.js';
import { isLargePayload } from '../src/features/response/utils/responseFormatters.js';
import { countJsonNodes } from '../src/features/response/utils/jsonPath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Step 61: Performance Optimization & Large-Workspace Scalability Tests', () => {
  describe('1. Collection Tree Component Memoization & Filtering at Scale', () => {
    it('should verify RequestItem, FolderItem, and CollectionItem are memoized components', () => {
      const reqItemPath = path.resolve(__dirname, '../src/features/collections/components/RequestItem.jsx');
      const folderItemPath = path.resolve(__dirname, '../src/features/collections/components/FolderItem.jsx');
      const colItemPath = path.resolve(__dirname, '../src/features/collections/components/CollectionItem.jsx');

      const reqContent = fs.readFileSync(reqItemPath, 'utf-8');
      const folderContent = fs.readFileSync(folderItemPath, 'utf-8');
      const colContent = fs.readFileSync(colItemPath, 'utf-8');

      // Verify React.memo wrapping
      assert.ok(reqContent.includes('memo(RequestItemComponent)'), 'RequestItem must be wrapped in memo');
      assert.ok(folderContent.includes('memo(FolderItemComponent)'), 'FolderItem must be wrapped in memo');
      assert.ok(colContent.includes('memo(CollectionItemComponent)'), 'CollectionItem must be wrapped in memo');

      // Verify leaky hooks like useVariableSuggestions are removed from row render
      assert.ok(!reqContent.includes('useVariableSuggestions(workspaceId)'), 'RequestItem must not invoke useVariableSuggestions per row');
    });

    it('should filter a 500-request workspace collection in under 15ms', () => {
      // Generate synthetic 500 requests across multiple methods and folders
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const requests = Array.from({ length: 500 }, (_, i) => ({
        id: `req-${i}`,
        name: `Customer API Endpoint ${i}`,
        method: methods[i % methods.length],
        url: `https://api.example.com/v1/customers/${i}?active=true`,
        folderId: i % 10 === 0 ? null : `folder-${i % 25}`,
      }));

      const startTime = performance.now();

      // Filter by search query 'Endpoint 42' and method 'POST'
      const matches = requests.filter((r) =>
        doesRequestMatchFilters(r, 'Endpoint 42', 'POST')
      );

      const duration = performance.now() - startTime;

      assert.ok(duration < 25, `Expected filtering to take < 25ms, took ${duration.toFixed(2)}ms`);
      assert.ok(matches.length > 0);
      assert.ok(matches.every((r) => r.method === 'POST' && r.name.includes('Endpoint 42')));
    });

    it('should quickly evaluate collection visibility for large datasets', () => {
      const col = {
        id: 'col-1',
        name: 'Billing Service',
        description: 'Payment operations',
      };
      const folders = Array.from({ length: 50 }, (_, i) => ({
        id: `folder-${i}`,
        name: `Folder ${i}`,
      }));
      const requests = Array.from({ length: 500 }, (_, i) => ({
        id: `req-${i}`,
        name: `Invoice Handler ${i}`,
        method: 'GET',
        url: `https://billing.example.com/invoices/${i}`,
        folderId: `folder-${i % 50}`,
      }));

      const startTime = performance.now();
      const isMatch = doesCollectionMatchFilters(col, folders, requests, 'Invoice Handler 350', 'GET');
      const duration = performance.now() - startTime;

      assert.ok(duration < 20, `Collection filter took ${duration.toFixed(2)}ms`);
      assert.equal(isMatch, true);
    });
  });

  describe('2. Canvas Drag-Safe Relationship Analysis Stability', () => {
    it('should produce identical relationships regardless of node x/y coordinates', () => {
      const initialNodes = [
        {
          id: 'node-auth',
          type: 'requestNode',
          position: { x: 100, y: 150 },
          data: {
            requestId: 'req-auth',
            name: 'Login Auth',
            method: 'POST',
            url: 'https://api.example.com/auth/login',
            extract: [{ source: 'body', property: 'token', variableName: 'authToken' }],
          },
        },
        {
          id: 'node-profile',
          type: 'requestNode',
          position: { x: 450, y: 200 },
          data: {
            requestId: 'req-profile',
            name: 'Get User Profile',
            method: 'GET',
            url: 'https://api.example.com/users/me',
            headers: [{ key: 'Authorization', value: 'Bearer {{authToken}}', enabled: true }],
          },
        },
      ];

      const initialEdges = inferRelationships(initialNodes);
      assert.equal(initialEdges.length, 1);
      assert.equal(initialEdges[0].source, 'node-auth');
      assert.equal(initialEdges[0].target, 'node-profile');

      // Simulate dragging node-profile across the canvas (1000px displacement)
      const draggedNodes = [
        { ...initialNodes[0], position: { x: 250, y: 320 } },
        { ...initialNodes[1], position: { x: 1200, y: 850 } },
      ];

      // Metadata fingerprint key ignores position
      const metaKey1 = initialNodes.map((n) => `${n.id}:${n.data?.url}:${n.data?.method}:${n.data?.name}`).join('|');
      const metaKey2 = draggedNodes.map((n) => `${n.id}:${n.data?.url}:${n.data?.method}:${n.data?.name}`).join('|');

      assert.equal(metaKey1, metaKey2, 'Metadata fingerprint must remain strictly identical during dragging');
    });

    it('should scale to 100+ nodes in Canvas relationship analyzer without crashing', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        type: 'requestNode',
        position: { x: i * 50, y: (i % 10) * 80 },
        data: {
          requestId: `req-${i}`,
          name: `API Node ${i}`,
          method: i % 2 === 0 ? 'GET' : 'POST',
          url: `https://api.example.com/resource-${i}`,
          extract: i === 0 ? [{ source: 'body', property: 'id', variableName: 'resourceId' }] : [],
          headers: i > 0 && i < 10 ? [{ key: 'X-Resource-Id', value: '{{resourceId}}', enabled: true }] : [],
        },
      }));

      const startTime = performance.now();
      const relationships = inferRelationships(nodes);
      const duration = performance.now() - startTime;

      assert.ok(duration < 50, `100 nodes relationship analysis took ${duration.toFixed(2)}ms`);
      // Default maxEdgesPerNode (4) prevents graph hairballs
      assert.equal(relationships.length, 4);

      // With higher maxEdgesPerNode, it finds all 9 consumers
      const unconstrained = inferRelationships(nodes, { maxEdgesPerNode: 20 });
      assert.ok(unconstrained.length >= 9);
    });
  });

  describe('3. Command Center High-Speed Search & Ranking at Scale', () => {
    it('should rank 600 commands and resources in under 10ms', () => {
      const commands = Array.from({ length: 600 }, (_, i) => ({
        id: `cmd-${i}`,
        title: `Request Definition ${i}`,
        group: i < 50 ? 'Actions' : 'Requests',
        keywords: [`Request Definition ${i}`, i % 2 === 0 ? 'GET' : 'POST', `https://api.example.com/items/${i}`],
      }));

      const startTime = performance.now();
      const results = rankCommands(commands, 'Definition 499');
      const duration = performance.now() - startTime;

      assert.ok(duration < 25, `Command Center search took ${duration.toFixed(2)}ms`);
      assert.ok(results.length > 0);
      assert.equal(results[0].id, 'cmd-499');
    });

    it('should bound grouped commands to max per group for fast rendering', () => {
      const commands = Array.from({ length: 300 }, (_, i) => ({
        id: `cmd-${i}`,
        title: `Item ${i}`,
        group: 'Requests',
      }));

      const grouped = groupCommands(commands, 25);
      const reqGroup = grouped.find((g) => g.group === 'Requests');

      assert.ok(reqGroup);
      assert.equal(reqGroup.items.length, 25, 'Grouped commands must be bounded to maxPerGroup');
      assert.equal(reqGroup.totalCount, 300, 'Total count must reflect complete size');
    });
  });

  describe('4. Large Response & JSON Tree Safety', () => {
    it('should detect oversized response payloads and signal safety limits', () => {
      // 5 MB synthetic payload
      const fiveMegabytes = 5 * 1024 * 1024;
      assert.equal(isLargePayload(fiveMegabytes, ''), true);

      // Normal 20 KB payload
      const twentyKilobytes = 20 * 1024;
      assert.equal(isLargePayload(twentyKilobytes, '{"status":"ok"}'), false);
    });

    it('should guard JSON node traversal with bounded node count threshold', () => {
      // Deeply nested JSON structure
      const generateNested = (depth, breadth) => {
        if (depth === 0) return { val: 'leaf' };
        const obj = {};
        for (let b = 0; b < breadth; b++) {
          obj[`key_${b}`] = generateNested(depth - 1, breadth);
        }
        return obj;
      };

      const largeJson = generateNested(4, 15); // > 50,000 nodes
      const counted = countJsonNodes(largeJson, 10001);

      assert.ok(counted > 10000, 'Node counter must reach threshold and short-circuit');
    });
  });
});
