import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { registrationRoute } from './routes/webhooks/registration';
import { attendanceRoute } from './routes/webhooks/attendance';
import { orderRoute } from './routes/webhooks/order';
import { paymentRoute } from './routes/webhooks/payment';
import { bizonReportRoute } from './routes/webhooks/bizon-report';
import { authRoutes } from './routes/auth';
import { adminUserRoutes } from './routes/admin/users';
import { manualRoute } from './routes/manual';
import { requireAuth } from './middleware/auth';
import { moduleRegistry } from './modules/module-registry';
import { coreModule } from './modules/core';
import { trafficModule } from './modules/traffic';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  // ── Security: remove X-Powered-By style headers ──
  app.addHook('onSend', async (_request, reply) => {
    reply.removeHeader('x-powered-by');
    reply.removeHeader('server');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
  });

  // ── CORS ──
  const allowedOrigin = process.env.CORS_ORIGIN ?? process.env.VITE_API_URL ?? true;
  await app.register(cors, {
    origin: allowedOrigin === 'true' || allowedOrigin === true ? true : allowedOrigin,
    credentials: true,
  });

  // ── Multipart (for file uploads) ──
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  // ── Rate limiting (general) ──
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  });

  // ── Health check ──
  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // ── Auth routes ──
  await app.register(authRoutes, { prefix: '/api/auth' });

  // ── Admin routes ──
  await app.register(adminUserRoutes, { prefix: '/api/admin/users' });

  // ── Webhook routes ──
  await app.register(registrationRoute, { prefix: '/api/webhooks' });
  await app.register(attendanceRoute, { prefix: '/api/webhooks' });
  await app.register(orderRoute, { prefix: '/api/webhooks' });
  await app.register(paymentRoute, { prefix: '/api/webhooks' });
  await app.register(bizonReportRoute, { prefix: '/api/webhooks' });

  // ── Manual data entry routes ──
  await app.register(manualRoute, { prefix: '/api/manual' });

  // ── Module system ──
  moduleRegistry.register(coreModule);
  moduleRegistry.register(trafficModule);
  await moduleRegistry.initAll(app);

  // Module manifests endpoint
  app.get('/api/modules', { preHandler: [requireAuth] }, async () => {
    return moduleRegistry.getManifests();
  });

  return app;
}
