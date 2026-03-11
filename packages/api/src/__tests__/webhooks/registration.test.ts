import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../app';
import { registrationPayload } from '../fixtures/webhooks';

const API_KEY = process.env.WEBHOOK_API_KEY ?? 'test-api-key';

describe('POST /api/webhooks/registration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a registration and links to a webinar', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/registration',
      headers: { 'x-api-key': API_KEY },
      payload: registrationPayload,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('contact_id');
    expect(body).toHaveProperty('webinar_id');
  });

  it('is idempotent — duplicate gc_deal_id does not create a duplicate', async () => {
    // Send first time
    await app.inject({
      method: 'POST',
      url: '/api/webhooks/registration',
      headers: { 'x-api-key': API_KEY },
      payload: registrationPayload,
    });

    // Send second time with same gc_deal_id
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/registration',
      headers: { 'x-api-key': API_KEY },
      payload: registrationPayload,
    });

    expect(response.statusCode).toBe(201);
    // Should return same id
    const body = response.json();
    expect(body).toHaveProperty('id');
  });

  it('returns 401 without API key', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/webhooks/registration',
      payload: registrationPayload,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized' });
  });
});
