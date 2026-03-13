import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { registrationRoute } from './routes/webhooks/registration';
import { attendanceRoute } from './routes/webhooks/attendance';
import { orderRoute } from './routes/webhooks/order';
import { paymentRoute } from './routes/webhooks/payment';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Webhook routes
  await app.register(registrationRoute, { prefix: '/api/webhooks' });
  await app.register(attendanceRoute, { prefix: '/api/webhooks' });
  await app.register(orderRoute, { prefix: '/api/webhooks' });
  await app.register(paymentRoute, { prefix: '/api/webhooks' });

  return app;
}
