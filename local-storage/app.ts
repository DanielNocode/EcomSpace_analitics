import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
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

  // TODO: Register routes
  // await app.register(webhookRoutes, { prefix: '/api/webhooks' });
  // await app.register(webinarRoutes, { prefix: '/api/webinars' });
  // await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  // await app.register(authRoutes, { prefix: '/api/auth' });
  // await app.register(settingsRoutes, { prefix: '/api/settings' });

  return app;
}
