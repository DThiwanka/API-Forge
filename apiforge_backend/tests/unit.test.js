import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/services/auth/password.service.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/services/auth/token.service.js';
import { sanitizeUser } from '../src/services/auth/auth.service.js';

describe('Auth Unit Tests', () => {
  it('passwordService should hash and verify password correctly with Argon2id', async () => {
    const raw = 'SuperSecret123!';
    const hashed = await hashPassword(raw);

    assert.ok(hashed.startsWith('$argon2id$'));
    assert.equal(await verifyPassword(hashed, raw), true);
    assert.equal(await verifyPassword(hashed, 'wrong-password'), false);
    assert.equal(await verifyPassword(null, raw), false);
  });

  it('tokenService should generate and verify access tokens', () => {
    const user = { id: 'uuid-1234', email: 'user@example.com' };
    const token = generateAccessToken(user);
    const decoded = verifyAccessToken(token);

    assert.equal(decoded.sub, user.id);
    assert.equal(decoded.email, user.email);
    assert.equal(decoded.type, 'access');
  });

  it('tokenService should generate and verify refresh tokens', () => {
    const user = { id: 'uuid-1234' };
    const token = generateRefreshToken(user);
    const decoded = verifyRefreshToken(token);

    assert.equal(decoded.sub, user.id);
    assert.equal(decoded.type, 'refresh');
  });

  it('tokenService should reject cross-type verification', () => {
    const user = { id: 'uuid-1234', email: 'user@example.com' };
    const refreshToken = generateRefreshToken(user);

    // Verifying a refresh token as an access token must fail
    assert.throws(() => verifyAccessToken(refreshToken), /invalid/i);
  });

  it('sanitizeUser should strip password and preserve all other fields', () => {
    const rawUser = {
      id: 'uuid-1',
      email: 'a@b.com',
      password: '$argon2id$...',
      name: 'Tester',
      isActive: true,
      createdAt: new Date(),
    };

    const sanitized = sanitizeUser(rawUser);
    assert.equal(sanitized.password, undefined);
    assert.equal(sanitized.id, rawUser.id);
    assert.equal(sanitized.email, rawUser.email);
  });
});

import { resolveVariables, transformQueryParams, transformAuth, transformBody } from '../src/services/requests/request-transform.service.js';
import { isPrivateIPv4, isPrivateIPv6, isLoopback } from '../src/services/execution/ssrf-protection.service.js';
import { resolveTimeout } from '../src/services/execution/timeout.service.js';

describe('Execution Engine Unit Tests', () => {
  describe('Variable Resolution', () => {
    it('should resolve single and multiple string placeholders', () => {
      const template = 'https://{{domain}}/api/v1/users/{{userId}}';
      const resolved = resolveVariables(template, { domain: 'example.com', userId: 42 });
      assert.equal(resolved, 'https://example.com/api/v1/users/42');
    });

    it('should resolve placeholders with inner whitespace', () => {
      const template = 'Bearer {{  token  }}';
      const resolved = resolveVariables(template, { token: 'xyz' });
      assert.equal(resolved, 'Bearer xyz');
    });

    it('should resolve nested objects and arrays', () => {
      const target = {
        name: '{{name}}',
        tags: ['{{tag1}}', 'constant'],
        meta: { env: '{{env}}' },
      };
      const resolved = resolveVariables(target, { name: 'Dulaj', tag1: 'admin', env: 'prod' });
      assert.deepEqual(resolved, {
        name: 'Dulaj',
        tags: ['admin', 'constant'],
        meta: { env: 'prod' },
      });
    });

    it('should throw 400 AppError when a referenced variable is missing', () => {
      assert.throws(
        () => resolveVariables('Hello {{who}}', {}),
        (err) => err.statusCode === 400 && err.message.includes('Missing required variable: {{who}}')
      );
    });
  });

  describe('SSRF Protection IP Checks', () => {
    it('should correctly classify private and restricted IPv4 addresses', () => {
      assert.equal(isPrivateIPv4('127.0.0.1'), true);
      assert.equal(isPrivateIPv4('127.255.255.255'), true);
      assert.equal(isPrivateIPv4('10.0.0.1'), true);
      assert.equal(isPrivateIPv4('172.16.0.1'), true);
      assert.equal(isPrivateIPv4('172.31.255.255'), true);
      assert.equal(isPrivateIPv4('192.168.1.1'), true);
      assert.equal(isPrivateIPv4('169.254.169.254'), true);
      assert.equal(isPrivateIPv4('100.64.0.1'), true);
      assert.equal(isPrivateIPv4('0.0.0.0'), true);
      assert.equal(isPrivateIPv4('224.0.0.1'), true);
      assert.equal(isPrivateIPv4('240.0.0.1'), true);

      // Public IPs
      assert.equal(isPrivateIPv4('8.8.8.8'), false);
      assert.equal(isPrivateIPv4('1.1.1.1'), false);
      assert.equal(isPrivateIPv4('93.184.216.34'), false);
    });

    it('should correctly classify private IPv6 addresses', () => {
      assert.equal(isPrivateIPv6('::1'), true);
      assert.equal(isPrivateIPv6('fe80::1'), true);
      assert.equal(isPrivateIPv6('fc00::1'), true);
      assert.equal(isPrivateIPv6('fd12:3456:789a::1'), true);
      assert.equal(isPrivateIPv6('ff02::1'), true);
      assert.equal(isPrivateIPv6('::ffff:127.0.0.1'), true);

      // Public IPv6
      assert.equal(isPrivateIPv6('2001:4860:4860::8888'), false);
    });

    it('should recognize loopback addresses and hostnames', () => {
      assert.equal(isLoopback('localhost'), true);
      assert.equal(isLoopback('sub.localhost'), true);
      assert.equal(isLoopback('127.0.0.1'), true);
      assert.equal(isLoopback('127.1.2.3'), true);
      assert.equal(isLoopback('::1'), true);

      assert.equal(isLoopback('169.254.169.254'), false);
      assert.equal(isLoopback('10.0.0.1'), false);
      assert.equal(isLoopback('8.8.8.8'), false);
    });
  });

  describe('Timeout Clamping', () => {
    it('should clamp timeouts to bounds', () => {
      assert.equal(resolveTimeout(50), 100); // Clamped to min 100
      assert.equal(resolveTimeout(999999), 120000); // Clamped to max 120000
      assert.equal(resolveTimeout(5000), 5000); // Within valid range
      assert.equal(resolveTimeout(null), 30000); // Default
      assert.equal(resolveTimeout('invalid'), 30000); // Default
    });
  });
});

