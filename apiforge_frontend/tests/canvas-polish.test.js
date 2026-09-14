import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  requestToNode,
  arrangeNodesLayout,
  serializeCanvas,
  deserializeCanvas,
  getMethodStyle,
} from '../src/features/canvas/utils/nodeHelpers.js';
import { useCanvasStore } from '../src/features/canvas/store/canvasStore.js';

describe('Step 46: Spatial API Canvas UX & Interaction Polish — Unit Verification', () => {
  describe('1. Request Node Transformation & Breadcrumb Hierarchy', () => {
    it('should transform request into a valid React Flow node with breadcrumbs', () => {
      const sampleReq = {
        id: 'req-login-1',
        name: 'Login User',
        method: 'post',
        url: 'https://api.example.com/auth/login',
        collectionId: 'col-auth',
        folderId: 'folder-tokens',
        folderName: 'Tokens',
        lastStatus: 200,
        lastDurationMs: 142,
      };

      const node = requestToNode(sampleReq, { x: 200, y: 150 }, 'Auth Service');

      assert.equal(node.id, 'req-login-1');
      assert.equal(node.type, 'requestNode');
      assert.equal(node.position.x, 200);
      assert.equal(node.position.y, 150);

      const d = node.data;
      assert.equal(d.name, 'Login User');
      assert.equal(d.method, 'POST');
      assert.equal(d.collectionName, 'Auth Service');
      assert.equal(d.folderName, 'Tokens');
      assert.equal(d.breadcrumb, 'Auth Service / Tokens');
      assert.equal(d.lastStatus, 200);
      assert.equal(d.lastDurationMs, 142);
    });

    it('should fallback cleanly when folder is not specified', () => {
      const rootReq = {
        id: 'req-root-1',
        name: 'Root Status',
        method: 'get',
        url: 'https://api.example.com/status',
        collectionId: 'col-main',
      };

      const node = requestToNode(rootReq, { x: 50, y: 50 }, 'Main API');
      assert.equal(node.data.breadcrumb, 'Main API');
      assert.equal(node.data.folderName, null);
    });

    it('should resolve method styles for all standard HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      for (const m of methods) {
        const style = getMethodStyle(m);
        assert.ok(style.badge);
        assert.ok(style.dot);
      }
    });
  });

  describe('2. Duplicate Node Protection', () => {
    it('should prevent duplicate node creation and focus existing node instead', () => {
      const store = useCanvasStore.getState();
      store.resetCanvas();

      const reqA = {
        id: 'req-dup-test-1',
        name: 'Get Users',
        method: 'GET',
        url: 'https://api.example.com/users',
        collectionId: 'col-1',
      };

      // 1. First addition: succeeds
      const node1 = store.addRequestNode(reqA, 'Users Service');
      assert.equal(node1.id, 'req-dup-test-1');
      assert.equal(useCanvasStore.getState().nodes.length, 1);
      assert.equal(useCanvasStore.getState().selectedNodeId, 'req-dup-test-1');

      // 2. Second addition of same request: duplicate protection triggered
      const result2 = store.addRequestNode(reqA, 'Users Service');
      assert.equal(result2.isDuplicate, true);
      // Canvas node count must remain 1:
      assert.equal(useCanvasStore.getState().nodes.length, 1);
      // Node must be focused & selected:
      assert.equal(useCanvasStore.getState().selectedNodeId, 'req-dup-test-1');
      assert.equal(useCanvasStore.getState().focusNodeId, 'req-dup-test-1');
    });
  });

  describe('3. Multi-Selection & Batch Store Operations', () => {
    it('should select all nodes, clear selection, and batch delete selected nodes', () => {
      const store = useCanvasStore.getState();
      store.resetCanvas();

      const req1 = { id: 'req-batch-1', name: 'R1', method: 'GET', collectionId: 'col-1' };
      const req2 = { id: 'req-batch-2', name: 'R2', method: 'POST', collectionId: 'col-1' };
      const req3 = { id: 'req-batch-3', name: 'R3', method: 'DELETE', collectionId: 'col-1' };

      store.addRequestNode(req1);
      store.addRequestNode(req2);
      store.addRequestNode(req3);

      assert.equal(useCanvasStore.getState().nodes.length, 3);

      // Select all nodes
      store.selectAllNodes();
      assert.equal(useCanvasStore.getState().nodes.filter((n) => n.selected).length, 3);

      // Clear selection
      store.clearSelection();
      assert.equal(useCanvasStore.getState().nodes.filter((n) => n.selected).length, 0);
      assert.equal(useCanvasStore.getState().selectedNodeId, null);

      // Multi-select node 1 and 2, then batch delete
      const currentNodes = useCanvasStore.getState().nodes;
      store.setNodes(
        currentNodes.map((n) => ({
          ...n,
          selected: n.id === 'req-batch-1' || n.id === 'req-batch-2',
        }))
      );

      store.deleteSelectedNodes();

      const remaining = useCanvasStore.getState().nodes;
      assert.equal(remaining.length, 1);
      assert.equal(remaining[0].id, 'req-batch-3');
    });
  });

  describe('4. Deterministic Grid Layout Arrangement', () => {
    it('should arrange nodes in a clean, collision-free grid grouped by collection', () => {
      const mockNodes = [
        { id: 'n1', data: { collectionId: 'col-alpha' }, position: { x: 500, y: 300 } },
        { id: 'n2', data: { collectionId: 'col-alpha' }, position: { x: 10, y: 20 } },
        { id: 'n3', data: { collectionId: 'col-alpha' }, position: { x: 80, y: 900 } },
        { id: 'n4', data: { collectionId: 'col-alpha' }, position: { x: 300, y: 100 } },
        { id: 'n5', data: { collectionId: 'col-beta' }, position: { x: 40, y: 40 } },
      ];

      const collections = [
        { id: 'col-alpha', name: 'Alpha Service' },
        { id: 'col-beta', name: 'Beta Service' },
      ];

      const arranged = arrangeNodesLayout(mockNodes, collections);

      assert.equal(arranged.length, 5);

      // Check that all positions are defined numbers
      for (const node of arranged) {
        assert.equal(typeof node.position.x, 'number');
        assert.equal(typeof node.position.y, 'number');
      }

      // Check that no two nodes occupy the exact same (x, y) coordinates
      const coordSet = new Set(arranged.map((n) => `${n.position.x},${n.position.y}`));
      assert.equal(coordSet.size, 5, 'Every arranged node must have a unique coordinate');
    });

    it('should handle empty or invalid node arrays without crashing', () => {
      assert.deepEqual(arrangeNodesLayout([], []), []);
      assert.deepEqual(arrangeNodesLayout(null, []), []);
    });
  });

  describe('5. Canvas Serialization & Security Confidentiality', () => {
    it('should serialize canvas layout without leaking headers, bodies, tokens, or variables', () => {
      const sensitiveNodes = [
        {
          id: 'req-sec-1',
          type: 'requestNode',
          position: { x: 150, y: 220 },
          data: {
            name: 'Sensitive Auth',
            headers: { Authorization: 'Bearer super-secret-jwt' },
            body: { password: 'secretpassword123' },
            variables: { API_KEY: 'secret-key-xyz' },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'req-sec-1', target: 'req-sec-2', sourceHandle: 'right', targetHandle: 'left' },
      ];

      const viewport = { x: 10, y: 20, zoom: 1.5 };

      const serialized = serializeCanvas(sensitiveNodes, edges, viewport);

      assert.equal(serialized.nodes.length, 1);
      assert.equal(serialized.nodes[0].id, 'req-sec-1');
      assert.deepEqual(serialized.nodes[0].position, { x: 150, y: 220 });
      assert.equal(serialized.edges.length, 1);
      assert.deepEqual(serialized.viewport, { x: 10, y: 20, zoom: 1.5 });

      // Confidentiality assertions:
      assert.equal(serialized.nodes[0].data, undefined);
      assert.equal(serialized.nodes[0].headers, undefined);
      assert.equal(serialized.nodes[0].body, undefined);
      assert.equal(serialized.nodes[0].variables, undefined);
    });

    it('should safely deserialize layout and reconcile against available workspace requests', () => {
      const savedLayout = {
        nodes: [
          { id: 'req-live', position: { x: 100, y: 120 } },
          { id: 'req-deleted-on-server', position: { x: 200, y: 240 } },
        ],
        edges: [
          { id: 'e-1', source: 'req-live', target: 'req-deleted-on-server' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      const availableRequests = [
        { id: 'req-live', name: 'Live Endpoint', method: 'GET', collectionId: 'col-1' },
      ];
      const collections = [{ id: 'col-1', name: 'My Col' }];

      const restored = deserializeCanvas(savedLayout, availableRequests, collections);

      // Prunes deleted request:
      assert.equal(restored.nodes.length, 1);
      assert.equal(restored.nodes[0].id, 'req-live');
      // Prunes edge connected to deleted node:
      assert.equal(restored.edges.length, 0);
    });
  });
});
