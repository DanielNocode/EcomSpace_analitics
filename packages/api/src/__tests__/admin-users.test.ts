/**
 * Integration tests for Admin User Management endpoints:
 * GET /api/admin/users — list users (admin only)
 * GET /api/admin/users/:id — get single user (admin only)
 * POST /api/admin/users — create user (admin only)
 * PUT /api/admin/users/:id — update user (admin only)
 * DELETE /api/admin/users/:id — deactivate user (admin only)
 * POST /api/admin/users/:id/ban — ban user (admin only)
 * POST /api/admin/users/:id/unban — unban user (admin only)
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

describe('Admin User Management Routes', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let viewerToken: string;
  let adminUserId: string;
  let viewerUserId: string;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create admin user
    const admin = await seedUser({
      email: 'admin@test.com',
      name: 'Admin User',
      password: 'adminpass',
      role: 'ADMIN',
    });
    adminUserId = admin.id;

    // Create viewer user
    const viewer = await seedUser({
      email: 'viewer@test.com',
      name: 'Viewer User',
      password: 'viewerpass',
      role: 'VIEWER',
    });
    viewerUserId = viewer.id;

    // Login and get tokens
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'adminpass' },
    });
    adminToken = adminLogin.json().accessToken;

    const viewerLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'viewer@test.com', password: 'viewerpass' },
    });
    viewerToken = viewerLogin.json().accessToken;
  });

  // ── GET /api/admin/users ──

  describe('GET /api/admin/users', () => {
    it('returns user list for admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const users = res.json();
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThanOrEqual(2);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('email');
      expect(users[0]).toHaveProperty('name');
      expect(users[0]).toHaveProperty('role');
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/admin/users' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── GET /api/admin/users/:id ──

  describe('GET /api/admin/users/:id', () => {
    it('returns single user for admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${adminUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const user = res.json();
      expect(user).toHaveProperty('id', adminUserId);
      expect(user).toHaveProperty('email', 'admin@test.com');
      expect(user).toHaveProperty('role', 'ADMIN');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/admin/users/non-existent-id',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${adminUserId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/admin/users ──

  describe('POST /api/admin/users', () => {
    it('creates new user for admin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'newuser@test.com',
          name: 'New User',
          password: 'newpass123',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(201);
      const user = res.json();
      expect(user).toHaveProperty('email', 'newuser@test.com');
      expect(user).toHaveProperty('name', 'New User');
      expect(user).toHaveProperty('role', 'VIEWER');
      expect(user).toHaveProperty('active', true);
      expect(user).toHaveProperty('banned', false);
    });

    it('returns 409 if email already exists', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'admin@test.com',
          name: 'Duplicate User',
          password: 'pass123',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.error).toBe('User with this email already exists');
    });

    it('returns 422 for invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'invalid-email',
          name: 'Test',
          password: 'pass',
          role: 'INVALID_ROLE',
        },
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.error).toBe('Validation failed');
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users',
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: {
          email: 'another@test.com',
          name: 'Another User',
          password: 'pass123',
          role: 'VIEWER',
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── PUT /api/admin/users/:id ──

  describe('PUT /api/admin/users/:id', () => {
    it('updates user for admin', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${viewerUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Updated Viewer',
          active: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const user = res.json();
      expect(user.name).toBe('Updated Viewer');
      expect(user.active).toBe(false);
    });

    it('can update email if not taken', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${viewerUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'newemail@test.com',
        },
      });

      expect(res.statusCode).toBe(200);
      const user = res.json();
      expect(user.email).toBe('newemail@test.com');
    });

    it('can update password', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${viewerUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          password: 'newpassword123',
        },
      });

      expect(res.statusCode).toBe(200);

      // Verify new password works
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'viewer@test.com', password: 'newpassword123' },
      });
      expect(loginRes.statusCode).toBe(200);
    });

    it('returns 409 if updating to existing email', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${viewerUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'admin@test.com',
        },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.error).toBe('Email already taken');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/admin/users/non-existent-id',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/admin/users/${adminUserId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/admin/users/:id/ban ──

  describe('POST /api/admin/users/:id/ban', () => {
    it('bans user successfully', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'Test ban reason' },
      });

      expect(res.statusCode).toBe(200);
      const user = res.json();
      expect(user.banned).toBe(true);
      expect(user.banReason).toBe('Test ban reason');
      expect(user.bannedAt).toBeTruthy();
    });

    it('bans user without reason', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const user = res.json();
      expect(user.banned).toBe(true);
    });

    it('returns 400 if user already banned', async () => {
      // First ban
      await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'First ban' },
      });

      // Try to ban again
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'Second ban' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBe('User is already banned');
    });

    it('returns 400 when trying to ban self', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${adminUserId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'Cannot ban self' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBe('Cannot ban yourself');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users/non-existent-id/ban',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'Test' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${adminUserId}/ban`,
        headers: { authorization: `Bearer ${viewerToken}` },
        payload: { reason: 'Test' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /api/admin/users/:id/unban ──

  describe('POST /api/admin/users/:id/unban', () => {
    it('unbans user successfully', async () => {
      // First ban the user
      await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/ban`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { reason: 'Test ban' },
      });

      // Then unban
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/unban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const user = res.json();
      expect(user.banned).toBe(false);
      expect(user.banReason).toBeNull();
      expect(user.bannedAt).toBeNull();
    });

    it('returns 400 if user not banned', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/unban`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBe('User is not banned');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/admin/users/non-existent-id/unban',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/admin/users/${viewerUserId}/unban`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ── DELETE /api/admin/users/:id ──

  describe('DELETE /api/admin/users/:id', () => {
    it('deactivates user successfully', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${viewerUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.message).toBe('User deactivated');

      // Verify user is deactivated
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/admin/users/${viewerUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const user = getRes.json();
      expect(user.active).toBe(false);
    });

    it('returns 400 when trying to deactivate self', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${adminUserId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBe('Cannot deactivate yourself');
    });

    it('returns 404 for non-existent user', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/admin/users/non-existent-id',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 403 for non-admin user', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${adminUserId}`,
        headers: { authorization: `Bearer ${viewerToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });
});
