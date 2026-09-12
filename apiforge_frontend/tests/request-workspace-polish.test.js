import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { METHODS, getMethodConfig } from '../src/features/requests/utils/requestMethods.js';
import { getStatusCategory, getStatusStyles } from '../src/features/response/utils/responseStatusUtils.js';
import {
  formatTime,
  formatSize,
  isBinaryContentType,
  parseBodyContent,
} from '../src/features/response/utils/responseFormatters.js';

describe('Step 32: Request Workspace Polish — Unit Verification', () => {
  describe('HTTP Method Selectors & Color Accents', () => {
    it('should define all 7 standard HTTP verbs with distinct color accents', () => {
      const verbNames = METHODS.map((m) => m.method);
      assert.deepEqual(verbNames, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

      for (const m of METHODS) {
        assert.ok(m.color.includes('text-'), `Color accent missing text class for ${m.method}`);
        assert.ok(m.badge.includes('bg-'), `Badge missing bg class for ${m.method}`);
      }
    });

    it('should correctly normalize and look up method configurations', () => {
      assert.equal(getMethodConfig('get').color, 'text-emerald-400');
      assert.equal(getMethodConfig('POST').color, 'text-amber-400');
      assert.equal(getMethodConfig('put').color, 'text-blue-400');
      assert.equal(getMethodConfig('delete').color, 'text-rose-400');
      assert.equal(getMethodConfig('patch').color, 'text-purple-400');
      assert.equal(getMethodConfig('head').color, 'text-teal-400');
      assert.equal(getMethodConfig('options').color, 'text-indigo-400');
      // Fallback for unknown methods defaults to GET
      assert.equal(getMethodConfig('UNKNOWN').method, 'GET');
    });
  });

  describe('Response Status Categorization & Styling', () => {
    it('should categorize 2xx status codes as success with emerald accent', () => {
      assert.equal(getStatusCategory(200), 'success');
      assert.equal(getStatusCategory(201), 'success');
      assert.equal(getStatusCategory(204), 'success');

      const styles = getStatusStyles(200);
      assert.ok(styles.badge.includes('emerald'));
      assert.ok(styles.dot.includes('emerald'));
    });

    it('should categorize 3xx status codes as redirect with sky accent', () => {
      assert.equal(getStatusCategory(301), 'redirect');
      assert.equal(getStatusCategory(302), 'redirect');
      assert.equal(getStatusCategory(304), 'redirect');

      const styles = getStatusStyles(301);
      assert.ok(styles.badge.includes('sky'));
      assert.ok(styles.dot.includes('sky'));
    });

    it('should categorize 4xx status codes as client-error with amber accent', () => {
      assert.equal(getStatusCategory(400), 'client-error');
      assert.equal(getStatusCategory(401), 'client-error');
      assert.equal(getStatusCategory(403), 'client-error');
      assert.equal(getStatusCategory(404), 'client-error');
      assert.equal(getStatusCategory(422), 'client-error');

      const styles = getStatusStyles(404);
      assert.ok(styles.badge.includes('amber'));
      assert.ok(styles.dot.includes('amber'));
    });

    it('should categorize 5xx status codes as server-error with rose accent', () => {
      assert.equal(getStatusCategory(500), 'server-error');
      assert.equal(getStatusCategory(502), 'server-error');
      assert.equal(getStatusCategory(503), 'server-error');
      assert.equal(getStatusCategory(504), 'server-error');

      const styles = getStatusStyles(500);
      assert.ok(styles.badge.includes('rose'));
      assert.ok(styles.dot.includes('rose'));
    });

    it('should handle null, undefined, and non-numeric statuses gracefully', () => {
      assert.equal(getStatusCategory(null), 'unknown');
      assert.equal(getStatusCategory(undefined), 'unknown');
      assert.equal(getStatusCategory('200'), 'unknown');

      const styles = getStatusStyles(null);
      assert.ok(styles.badge.includes('slate'));
    });
  });

  describe('Response Metadata Formatters', () => {
    it('should format round-trip time in milliseconds and seconds', () => {
      assert.equal(formatTime(0), '0 ms');
      assert.equal(formatTime(45), '45 ms');
      assert.equal(formatTime(999), '999 ms');
      assert.equal(formatTime(1000), '1.00 s');
      assert.equal(formatTime(1450), '1.45 s');
      assert.equal(formatTime(3254), '3.25 s');
      assert.equal(formatTime(null), '-');
      assert.equal(formatTime(undefined), '-');
    });

    it('should format payload size in B, KB, and MB', () => {
      assert.equal(formatSize(0), '0 B');
      assert.equal(formatSize(512), '512 B');
      assert.equal(formatSize(1023), '1023 B');
      assert.equal(formatSize(1024), '1.0 KB');
      assert.equal(formatSize(15360), '15.0 KB');
      assert.equal(formatSize(1048576), '1.00 MB');
      assert.equal(formatSize(5242880), '5.00 MB');
      assert.equal(formatSize(null), '-');
      assert.equal(formatSize(undefined), '-');
    });
  });

  describe('Binary Content-Type Detection', () => {
    it('should identify images, audio, video, pdf, and octet-stream as binary', () => {
      assert.equal(isBinaryContentType('image/png'), true);
      assert.equal(isBinaryContentType('IMAGE/JPEG'), true);
      assert.equal(isBinaryContentType('audio/mpeg'), true);
      assert.equal(isBinaryContentType('video/mp4'), true);
      assert.equal(isBinaryContentType('application/pdf'), true);
      assert.equal(isBinaryContentType('application/octet-stream'), true);
      assert.equal(isBinaryContentType('application/zip'), true);
    });

    it('should identify text and json payloads as non-binary', () => {
      assert.equal(isBinaryContentType('application/json'), false);
      assert.equal(isBinaryContentType('application/json; charset=utf-8'), false);
      assert.equal(isBinaryContentType('text/html'), false);
      assert.equal(isBinaryContentType('text/plain'), false);
      assert.equal(isBinaryContentType('application/xml'), false);
      assert.equal(isBinaryContentType(''), false);
      assert.equal(isBinaryContentType(null), false);
    });
  });

  describe('Response Body Parser', () => {
    it('should parse object body into formatted JSON string', () => {
      const obj = { success: true, count: 42 };
      const res = parseBodyContent(obj);
      assert.equal(res.isJson, true);
      assert.equal(res.formattedText, JSON.stringify(obj, null, 2));
    });

    it('should parse stringified JSON into pretty-printed JSON', () => {
      const jsonStr = '{"key":"val"}';
      const res = parseBodyContent(jsonStr);
      assert.equal(res.isJson, true);
      assert.equal(res.formattedText, '{\n  "key": "val"\n}');
    });

    it('should pass plain text through as non-json', () => {
      const text = 'Hello world!';
      const res = parseBodyContent(text);
      assert.equal(res.isJson, false);
      assert.equal(res.formattedText, 'Hello world!');
    });

    it('should handle null and undefined body values cleanly', () => {
      assert.deepEqual(parseBodyContent(null), { formattedText: '', isJson: false });
      assert.deepEqual(parseBodyContent(undefined), { formattedText: '', isJson: false });
    });
  });

  describe('Resizable Split Bounds & Clamping Logic', () => {
    function clampSplit(percent) {
      return Math.min(Math.max(percent, 25), 75);
    }

    it('should clamp split percentage within 25% and 75%', () => {
      assert.equal(clampSplit(50), 50);
      assert.equal(clampSplit(10), 25);
      assert.equal(clampSplit(25), 25);
      assert.equal(clampSplit(75), 75);
      assert.equal(clampSplit(90), 75);
      assert.equal(clampSplit(0), 25);
      assert.equal(clampSplit(100), 75);
    });

    it('should correctly divide width between left and right panes', () => {
      const split = clampSplit(60);
      assert.equal(split, 60);
      assert.equal(100 - split, 40);
    });
  });
});

