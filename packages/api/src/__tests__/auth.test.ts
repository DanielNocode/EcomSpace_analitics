/**
 * Integration tests for Auth endpoints:
 * POST /api/auth/login
 * POST /api/auth/refresh
 * GET /api/auth/me
 * PUT /api/auth/change-password
 *
 * Also covers ADMIN vs VIEWER roles and banned user behavior.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUser(overrides: {
  email: string;
  name: string;
  password: string;
  role?: 'ADMIN' | 'VIEWER';
  active?: boolean;
  banned?: boolean;
  banReason?: string;
}) {
  const hash = await bcrypt.hash(overrides.password, 10);
  return prisma.user.create({
    data: {
      email: overrides.email,
      name: overrides.name,
      password: hash,
      role: overrides.role ?? 'VIEWER',
      active: overrides.active ?? true,
      banned: overrides.banned ?? false,
      banReason: overrides.banReason ?? null,
    },
  });
}

describe('Auth endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ── Login ──

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await seedUser({ email: 'viewer@test.com', name: 'Viewer', password: 'pass123', role: 'VIEWER' });
      await seedUser({ email: 'admin@test.com', name: 'Admin', password: 'adminpass', role: 'ADMIN' });
    });

    it('returns tokens on valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'viewer@test.com', password: 'pass123' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe('viewer@test.com');
      expect(body.user.role).toBe('VIEWER');
    });

    it('returns 401 on wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'viewer@test.com', password: 'wrongpass' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@test.com', password: 'pass123' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 422 on invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'not-an-email', password: '' },
      });

      expect(res.statusCode).toBe(422);
    });

    it('returns 403 for banned user', async () => {
      await seedUser({
        email: 'banned@test.com',
        name: 'Banned User',
        password: 'pass123',
        banned: true,
        banReason: 'Нарушение правил',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'banned@test.com', password: 'pass123' },
      });

      expect(res.statusCode).toBe(403);
      const body = res.json();
      expect(body).toHaveProperty('error', 'Account banned');
      expect(body).toHaveProperty('reason');
    });

    it('returns 401 for inactive user', async () => {
      await seedUser({ email: 'inactive@test.com', name: 'Inactive', password: 'pass123', active: false });

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'inactive@test.com', password: 'pass123' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── Refresh ──

  describe('POST /api/auth/refresh', () => {
    it('returns new token pair on valid refresh token', async () => {
      await seedUser({ email: 'refresh@test.com', name: 'Refresh User', password: 'pass123' });

      // First login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'refresh@test.com', password: 'pass123' },
      });
      const { refreshToken } = loginRes.json();

      // Use refresh token
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('returns 401 on invalid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        payload: { refreshToken: 'invalid.token.here' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /me ──

  describe('GET /api/auth/me', () => {
    it('returns user profile with valid token', async () => {
      await seedUser({ email: 'me@test.com', name: 'Me User', password: 'pass123' });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'me@test.com', password: 'pass123' },
      });
      const { accessToken } = loginRes.json();

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.email).toBe('me@test.com');
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: 'Bearer invalid.token' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Change password ──

  describe('PUT /api/auth/change-password', () => {
    it('changes password successfully', async () => {
      await seedUser({ email: 'changepw@test.com', name: 'Change PW', password: 'oldpass123' });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'changepw@test.com', password: 'oldpass123' },
      });
      const { accessToken } = loginRes.json();

      // Change password
      const res = await app.inject({
        method: 'PUT',
        url: '/api/auth/change-password',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { currentPassword: 'oldpass123', newPassword: 'newpass456' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('message');

      // Verify new password works
      const loginRes2 = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'changepw@test.com', password: 'newpass456' },
      });
      expect(loginRes2.statusCode).toBe(200);
    });

    it('returns 400 on wrong current password', async () => {
      await seedUser({ email: 'wrongpw@test.com', name: 'Wrong PW', password: 'correct123' });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'wrongpw@test.com', password: 'correct123' },
      });
      const { accessToken } = loginRes.json();

      const res = await app.inject({
        method: 'PUT',
        url: '/api/auth/change-password',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { currentPassword: 'wrongpass', newPassword: 'newpass456' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/auth/change-password',
        payload: { currentPassword: 'any', newPassword: 'newpass456' },
      });
      expect(res.statusCode).toBe(401);
    });
  });
});

// ── Admin User CRUD tests ──

describe('Admin User Management', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create admin and viewer
    await seedUser({ email: 'admin-crud@test.com', name: 'Admin CRUD', password: 'adminpass', role: 'ADMIN' });
    await seedUser({ email: 'viewer-crud@test.com', name: 'Viewer CRUD', password: 'viewerpass', role: 'VIEWER' });

    const adminLogin = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'admin-crud@test.com', password: 'adminpass' },
    });
    adminToken = adminLogin.json().accessToken;

    const viewerLogin = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'viewer-crud@test.com', password: 'viewerpass' },
    });
    viewerToken = viewerLogin.json().accessToken;
  });

  it('admin can list users', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const users = res.json();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThanOrEqual(2);
  });

  it('viewer cannot access admin user routes', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/admin/users',
      headers: { authorization: `Bearer ${viewerToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('admin can create user', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: 'new-user@test.com', name: 'New User', password: 'newpass123', role: 'VIEWER' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().email).toBe('new-user@test.com');
  });

  it('admin can ban and unban user', async () => {
    // Create user to ban
    const createRes = await app.inject({
      method: 'POST', url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: 'tobebanned@test.com', name: 'To Be Banned', password: 'pass123', role: 'VIEWER' },
    });
    const userId = createRes.json().id;

    // Ban
    const banRes = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userId}/ban`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reason: 'Нарушение правил тестирования' },
    });
    expect(banRes.statusCode).toBe(200);
    expect(banRes.json().banned).toBe(true);

    // Unban
    const unbanRes = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userId}/unban`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(unbanRes.statusCode).toBe(200);
    expect(unbanRes.json().banned).toBe(false);
  });
});
