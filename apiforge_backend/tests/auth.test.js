import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import prisma from '../src/config/database.js';

describe('Auth Integration Tests', () => {
  let server;
  let baseUrl;
  const testUser = {
    email: `auth_test_${Date.now()}@example.com`,
    password: 'Password123!',
    name: 'Auth Test User',
  };

  let authAccessToken = '';
  let authRefreshToken = '';
  let cookieHeader = '';

  before(async () => {
    // Start server on an ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });

    // Ensure clean state for auth tests
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'auth_test_',
        },
      },
    }).catch(() => {});
  });

  after(async () => {
    // Clean up created test user
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'auth_test_',
        },
      },
    }).catch(() => {});

    await prisma.$disconnect();

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('POST /api/auth/register should register a new user and return tokens without password', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testUser.email.toLowerCase());
    assert.equal(body.data.user.name, testUser.name);
    assert.equal(body.data.user.password, undefined); // Password must NEVER be exposed!
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);

    // Verify Set-Cookie headers
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    assert.ok(rawCookies.some((c) => c.includes('access_token=')));
    assert.ok(rawCookies.some((c) => c.includes('refresh_token=')));
  });

  it('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  it('POST /api/auth/register should fail with 400 for invalid email', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.ok(body.errors.some((e) => e.field === 'email'));
  });

  it('POST /api/auth/register should fail with 400 for short password (< 8 chars)', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'valid@example.com',
        password: 'short',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.ok(body.errors.some((e) => e.field === 'password'));
  });

  it('POST /api/auth/login should fail with 401 for incorrect password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword!',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid email or password');
  });

  it('POST /api/auth/login should fail with 401 for non-existent email', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'Password123!',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid email or password');
  });

  it('POST /api/auth/login should succeed with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testUser.email.toLowerCase());
    assert.equal(body.data.user.password, undefined);

    authAccessToken = body.data.accessToken;
    authRefreshToken = body.data.refreshToken;

    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
    assert.ok(cookieHeader.includes('access_token='));
  });

  it('GET /api/auth/me should return user profile with Authorization Bearer header', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authAccessToken}`,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testUser.email.toLowerCase());
    assert.equal(body.data.user.password, undefined);
  });

  it('GET /api/auth/me should return user profile with cookie auth', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.user.email, testUser.email.toLowerCase());
  });

  it('GET /api/auth/me should reject unauthenticated request with 401', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    const body = await res.json();
    assert.equal(res.status, 401);
    assert.equal(body.success, false);
  });

  it('POST /api/auth/refresh should issue new tokens with valid refresh token', async () => {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        refreshToken: authRefreshToken,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
  });

  it('POST /api/auth/logout should clear auth cookies', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookieHeader,
      },
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, 'Logged out successfully');

    const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    // Check expired max-age or expires header in cookie
    assert.ok(cookies.some((c) => c.includes('access_token=') && (c.includes('Max-Age=0') || c.includes('Expires='))));
  });
});

