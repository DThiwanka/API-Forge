import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateJson,
  formatJson,
  calculatePayloadMetrics,
  convertUrlEncodedToFormData,
  convertFormDataToUrlEncoded,
} from '../src/features/requests/utils/bodyUtils.js';

import { useRequestStore } from '../src/features/requests/store/requestStore.js';
import { findDuplicateKeys } from '../src/features/requests/utils/urlUtils.js';

describe('Step 39: Request Body Editor & Payload Authoring UX — Unit Verification', () => {
  describe('1. JSON Validation and Diagnostic Feedback', () => {
    it('should validate standard valid JSON objects and primitives', () => {
      const valid1 = '{"name": "APIForge", "active": true, "version": 2}';
      const res1 = validateJson(valid1);
      assert.equal(res1.valid, true);
      assert.equal(res1.templated, false);
      assert.equal(res1.error, null);

      const validArray = '[1, 2, 3, "test"]';
      const res2 = validateJson(validArray);
      assert.equal(res2.valid, true);
    });

    it('should tolerate unquoted {{template}} variables in JSON mode', () => {
      const templated = '{\n  "userId": {{userId}},\n  "token": "{{token}}"\n}';
      const result = validateJson(templated);
      assert.equal(result.valid, true);
      assert.equal(result.templated, true);
      assert.equal(result.error, null);
    });

    it('should diagnose invalid JSON and extract line and column coordinates', () => {
      const invalid = '{\n  "key": "value",\n  "broken": \n}';
      const result = validateJson(invalid);
      assert.equal(result.valid, false);
      assert.ok(result.error);
      assert.equal(typeof result.line, 'number');
      assert.equal(typeof result.column, 'number');
      assert.ok(result.line >= 1);
    });

    it('should treat empty or blank strings as valid empty JSON drafts', () => {
      const res1 = validateJson('');
      assert.equal(res1.valid, true);
      assert.equal(res1.empty, true);

      const res2 = validateJson('   \n  ');
      assert.equal(res2.valid, true);
      assert.equal(res2.empty, true);
    });
  });

  describe('2. JSON Formatting (Prettification)', () => {
    it('should format minified JSON into indented 2-space structure', () => {
      const minified = '{"a":1,"b":[2,3],"c":{"d":true}}';
      const formatted = formatJson(minified);
      assert.equal(
        formatted,
        '{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ],\n  "c": {\n    "d": true\n  }\n}'
      );
    });

    it('should format JSON while preserving template variables', () => {
      const input = '{"user":"{{username}}","count":{{itemCount}}}';
      const formatted = formatJson(input);
      assert.ok(formatted.includes('"user": "{{username}}"'));
      assert.ok(formatted.includes('"count": {{itemCount}}'));
    });

    it('should throw helpful error when attempting to format invalid syntax', () => {
      assert.throws(
        () => formatJson('{"broken": '),
        (err) => err.message.includes('Cannot format')
      );
    });
  });

  describe('3. Payload Metrics Calculation', () => {
    it('should calculate accurate line and byte size for string payloads', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const metrics = calculatePayloadMetrics(text, 'text');
      assert.equal(metrics.lines, 3);
      assert.equal(metrics.sizeBytes, 20); // 6 + 1 + 6 + 1 + 6 = 20 bytes
      assert.equal(metrics.formattedSize, '20 B');
    });

    it('should calculate active field count and serialized size for form rows', () => {
      const rows = [
        { key: 'user', value: 'admin', enabled: true },
        { key: 'pass', value: 'secret', enabled: true },
        { key: 'disabled', value: 'ignored', enabled: false },
        { key: '', value: '', enabled: true },
      ];
      const metrics = calculatePayloadMetrics(rows, 'x-www-form-urlencoded');
      assert.equal(metrics.lines, 2);
      assert.equal(metrics.sizeBytes, 'user=admin&pass=secret'.length);
    });

    it('should return zero metrics for empty or none mode', () => {
      const metrics = calculatePayloadMetrics('', 'none');
      assert.equal(metrics.lines, 0);
      assert.equal(metrics.sizeBytes, 0);
      assert.equal(metrics.formattedSize, '0 B');
    });
  });

  describe('4. Inter-mode Form Data Conversion & Non-Destructive Switching', () => {
    it('should convert URL-encoded rows to Form Data rows with text type', () => {
      const urlencoded = [
        { key: 'client_id', value: 'my_app', enabled: true, description: 'Client identifier' },
      ];
      const formData = convertUrlEncodedToFormData(urlencoded);
      assert.equal(formData.length, 1);
      assert.equal(formData[0].key, 'client_id');
      assert.equal(formData[0].value, 'my_app');
      assert.equal(formData[0].type, 'text');
      assert.equal(formData[0].description, 'Client identifier');
    });

    it('should convert Form Data rows to URL-encoded rows preserving values', () => {
      const formData = [
        { key: 'token', value: '{{token}}', type: 'text', enabled: true, description: 'Auth token' },
      ];
      const urlencoded = convertFormDataToUrlEncoded(formData);
      assert.equal(urlencoded.length, 1);
      assert.equal(urlencoded[0].key, 'token');
      assert.equal(urlencoded[0].value, '{{token}}');
      assert.equal(urlencoded[0].enabled, true);
    });
  });

  describe('5. Duplicate Key Detection in Form Payloads', () => {
    it('should detect duplicate keys in form-data rows', () => {
      const rows = [
        { key: 'tag', value: 'v1', enabled: true },
        { key: 'tag', value: 'v2', enabled: true },
        { key: 'name', value: 'test', enabled: true },
      ];
      const duplicates = findDuplicateKeys(rows, false);
      assert.equal(duplicates.has('tag'), true);
      assert.equal(duplicates.has('name'), false);
    });
  });

  describe('6. Zustand Store Body Actions and Dirty State Integration', () => {
    beforeEach(() => {
      useRequestStore.setState({
        id: 'req-body-test',
        workspaceId: 'ws-1',
        method: 'POST',
        url: 'https://api.example.com/data',
        headers: [{ key: '', value: '', enabled: true, description: '' }],
        body: {
          mode: 'none',
          raw: '',
          urlencoded: [{ key: '', value: '', enabled: true, description: '' }],
          formData: [{ key: '', value: '', type: 'text', enabled: true, description: '' }],
        },
        isDirty: false,
      });
    });

    it('should mark request dirty when editing raw body text', () => {
      const store = useRequestStore.getState();
      store.setBodyRaw('{"test": 123}');

      const state = useRequestStore.getState();
      assert.equal(state.body.raw, '{"test": 123}');
      assert.equal(state.isDirty, true);
    });

    it('should clear raw body and mark dirty', () => {
      const store = useRequestStore.getState();
      store.setBodyRaw('some content');
      store.clearBodyRaw();

      const state = useRequestStore.getState();
      assert.equal(state.body.raw, '');
      assert.equal(state.isDirty, true);
    });

    it('should manage form-data rows (add, update, duplicate, remove, bulk toggle, clear)', () => {
      const store = useRequestStore.getState();
      store.setBodyMode('form-data');

      // Update first row
      store.updateBodyFormData(0, 'key', 'fileField');
      store.updateBodyFormData(0, 'type', 'file');
      store.updateBodyFormData(0, 'value', './sample.pdf');

      let state = useRequestStore.getState();
      assert.equal(state.body.formData[0].key, 'fileField');
      assert.equal(state.body.formData[0].type, 'file');
      assert.equal(state.body.formData[0].value, './sample.pdf');

      // Duplicate row
      store.duplicateBodyFormData(0);
      state = useRequestStore.getState();
      assert.equal(state.body.formData.length >= 2, true);
      assert.equal(state.body.formData[1].key, 'fileField');

      // Disable all
      store.enableAllBodyFormData(false);
      state = useRequestStore.getState();
      assert.ok(state.body.formData.every((f) => f.enabled === false));

      // Clear all
      store.clearBodyFormData();
      state = useRequestStore.getState();
      assert.equal(state.body.formData.length, 1);
      assert.equal(state.body.formData[0].key, '');
    });

    it('should serialize formData in getCleanPayload when mode is form-data', () => {
      const store = useRequestStore.getState();
      store.setBodyMode('form-data');
      store.updateBodyFormData(0, 'key', 'profilePicture');
      store.updateBodyFormData(0, 'type', 'file');
      store.updateBodyFormData(0, 'value', '/photos/me.jpg');

      const payload = store.getCleanPayload();
      assert.equal(payload.body.mode, 'form-data');
      assert.ok(Array.isArray(payload.body.formData));
      assert.equal(payload.body.formData.length, 1);
      assert.equal(payload.body.formData[0].key, 'profilePicture');
      assert.equal(payload.body.formData[0].type, 'file');
      assert.equal(payload.body.formData[0].value, '/photos/me.jpg');
    });

    it('should manage urlencoded bulk actions', () => {
      const store = useRequestStore.getState();
      store.setBodyMode('x-www-form-urlencoded');
      store.updateBodyUrlEncoded(0, 'key', 'grant_type');
      store.updateBodyUrlEncoded(0, 'value', 'authorization_code');

      store.enableAllBodyUrlEncoded(false);
      let state = useRequestStore.getState();
      assert.equal(state.body.urlencoded[0].enabled, false);

      store.clearBodyUrlEncoded();
      state = useRequestStore.getState();
      assert.equal(state.body.urlencoded.length, 1);
      assert.equal(state.body.urlencoded[0].key, '');
    });
  });

  describe('7. Security & Inertness', () => {
    it('should treat scripts and HTML as inert text without executing', () => {
      const malicious = '<script>window.__COMPROMISED__ = true;</script>';
      const validated = validateJson(malicious);
      assert.equal(validated.valid, false); // invalid json, remains inert
      assert.equal(typeof globalThis.__COMPROMISED__, 'undefined');
    });
  });
});

