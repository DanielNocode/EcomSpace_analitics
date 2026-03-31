import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { attendancePayload } from '../fixtures/webhooks';

const API_KEY = process.env.WEBHOOK_API_KEY ?? 'test-api-key';

describe('POST /api/webhooks/attendance', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates an attendance and links to a webinar', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/attendance',
      headers: { 'x-api-key': API_KEY },
      payload: attendancePayload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('contact_id');
    expect(body).toHaveProperty('webinar_id');
  });
});
