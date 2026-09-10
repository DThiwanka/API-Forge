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

