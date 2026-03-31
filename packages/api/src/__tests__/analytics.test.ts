/**
 * Integration tests for Analytics endpoints:
 * GET /api/modules/core/overview
 * GET /api/modules/core/webinars
 * GET /api/modules/core/webinars/:id
 * GET /api/modules/core/webinars/:id/funnel
 * GET /api/modules/core/webinars/:id/by-source
 * GET /api/modules/core/deferred
 * GET /api/modules/core/dead-leads
 * GET /api/modules/core/time-to-action
 * GET /api/modules/core/anomalies
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const API_KEY = process.env.WEBHOOK_API_KEY ?? 'test-api-key';

async function getViewerToken(app: FastifyInstance): Promise<string> {
  const hash = await bcrypt.hash('testpass', 10);
  await prisma.user.create({
    data: { email: 'analytics-test@test.com', name: 'Test', password: hash, role: 'VIEWER', active: true },
  });
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'analytics-test@test.com', password: 'testpass' },
  });
  return res.json().accessToken;
}

describe('Analytics Endpoints', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    token = await getViewerToken(app);
  });

  // ── Overview ──

  describe('GET /api/modules/core/overview', () => {
    it('returns aggregate stats', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/overview',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('totalRegistrations');
      expect(body).toHaveProperty('totalAttendances');
      expect(body).toHaveProperty('totalOrders');
      expect(body).toHaveProperty('totalPayments');
      expect(body).toHaveProperty('totalRevenue');
    });

    it('requires authentication', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/modules/core/overview' });
      expect(res.statusCode).toBe(401);
    });

    it('accepts date filters', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/overview?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Webinars list ──

  describe('GET /api/modules/core/webinars', () => {
    it('returns an array', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/webinars',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });

    it('returns 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/modules/core/webinars' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ── Webinar detail ──

  describe('GET /api/modules/core/webinars/:id', () => {
    it('returns 404 for non-existent webinar', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/webinars/non-existent-id',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns detail for existing webinar', async () => {
      // Create a webinar via registration webhook
      await app.inject({
        method: 'POST',
        url: '/api/webhooks/registration',
        headers: { 'x-api-key': API_KEY },
        payload: {
          gc_deal_id: 'analytics-reg-001',
          gc_user_id: 'analytics-user-001',
          email: 'analytics@test.com',
          webinar_date: '2026-03-15T20:00:00+03:00',
          funnel: 'analytics-test',
          registered_at: '2026-03-14T10:00:00+03:00',
        },
      });

      // Get webinars list
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/modules/core/webinars',
        headers: { authorization: `Bearer ${token}` },
      });
      const webinars = listRes.json();
      expect(webinars.length).toBeGreaterThanOrEqual(1);

      const webinarId = webinars[0].id;
      const res = await app.inject({
        method: 'GET',
        url: `/api/modules/core/webinars/${webinarId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Response shape: { webinar: {...}, stats: {...}, bizonReport: null }
      expect(body).toHaveProperty('webinar');
      expect(body.webinar).toHaveProperty('id', webinarId);
      expect(body).toHaveProperty('stats');
      expect(body.stats).toHaveProperty('registrations');
    });
  });

  // ── Funnel ──

  describe('GET /api/modules/core/webinars/:id/funnel', () => {
    it('returns funnel data for existing webinar', async () => {
      // Seed some data
      await app.inject({
        method: 'POST',
        url: '/api/webhooks/registration',
        headers: { 'x-api-key': API_KEY },
        payload: {
          gc_deal_id: 'funnel-reg-001',
          gc_user_id: 'funnel-user-001',
          email: 'funnel@test.com',
          webinar_date: '2026-03-20T20:00:00+03:00',
          funnel: 'main',
          registered_at: '2026-03-19T10:00:00+03:00',
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/modules/core/webinars',
        headers: { authorization: `Bearer ${token}` },
      });
      const webinarId = listRes.json()[0].id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/modules/core/webinars/${webinarId}/funnel`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Response is an array of funnel stages: [{stage, count, conversionFromPrev}]
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(4);
      expect(body[0]).toHaveProperty('stage');
      expect(body[0]).toHaveProperty('count');
    });
  });

  // ── Deferred ──

  describe('GET /api/modules/core/deferred', () => {
    it('returns deferred payments list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/deferred',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Dead leads ──

  describe('GET /api/modules/core/dead-leads', () => {
    it('returns dead leads', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/dead-leads',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('accepts days param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/dead-leads?days=30',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  // ── Time to action ──

  describe('GET /api/modules/core/time-to-action', () => {
    it('returns timing stats', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/time-to-action',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      // Response shape: { registrationToAttendance: { avgHours, sampleSize }, ... }
      expect(body).toHaveProperty('registrationToAttendance');
      expect(body).toHaveProperty('attendanceToOrder');
      expect(body).toHaveProperty('orderToPayment');
    });
  });

  // ── Anomalies ──

  describe('GET /api/modules/core/anomalies', () => {
    it('returns anomaly list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/modules/core/anomalies',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json())).toBe(true);
    });
  });
});
