import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import {
  attendancePayload,
  orderPayload,
  paymentScenarioA,
  paymentScenarioB,
} from '../fixtures/webhooks';

const API_KEY = process.env.WEBHOOK_API_KEY ?? 'test-api-key';

describe('POST /api/webhooks/payment', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Scenario A: updates existing order status to PAID', async () => {
    // Create attendance + order first
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/attendance',
      headers: { 'x-api-key': API_KEY },
      payload: attendancePayload,
    });

    await app.inject({
      method: 'POST',
      url: '/api/webhooks/order',
      headers: { 'x-api-key': API_KEY },
      payload: orderPayload,
    });

    // Payment scenario A
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/payment',
      headers: { 'x-api-key': API_KEY },
      payload: paymentScenarioA,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('PAID');
  });

  it('Scenario B: creates new PAID order for contact', async () => {
    // Create attendance first (for the contact)
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/attendance',
      headers: { 'x-api-key': API_KEY },
      payload: attendancePayload,
    });

    // Payment scenario B — no existing unpaid order
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/payment',
      headers: { 'x-api-key': API_KEY },
      payload: paymentScenarioB,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('PAID');
  });
});
