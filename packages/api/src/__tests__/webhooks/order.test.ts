import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { attendancePayload, orderPayload, orderNoAttendancePayload } from '../fixtures/webhooks';

const API_KEY = process.env.WEBHOOK_API_KEY ?? 'test-api-key';

describe('POST /api/webhooks/order', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an order with DIRECT attribution after recent attendance', async () => {
    // First create attendance
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/attendance',
      headers: { 'x-api-key': API_KEY },
      payload: attendancePayload,
    });

    // Then create order
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/order',
      headers: { 'x-api-key': API_KEY },
      payload: orderPayload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body.attribution_type).toBe('DIRECT');
    expect(body.attributed_webinar_id).toBeTruthy();
  });

  it('creates an order with UNATTRIBUTED when no attendance exists', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/order',
      headers: { 'x-api-key': API_KEY },
      payload: orderNoAttendancePayload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.attribution_type).toBe('UNATTRIBUTED');
    expect(body.attributed_webinar_id).toBeNull();
  });
});
