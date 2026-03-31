import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware to verify API key from X-API-Key header or Authorization: Bearer <key>.
 * Used to protect webhook endpoints.
 */
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expectedKey = process.env.WEBHOOK_API_KEY;

  if (!expectedKey) {
    request.log.error('WEBHOOK_API_KEY is not configured');
    return reply.status(500).send({ error: 'Server misconfiguration' });
  }

  const apiKey = request.headers['x-api-key'] as string | undefined;
  const authHeader = request.headers['authorization'] as string | undefined;

  let providedKey: string | undefined;

  if (apiKey) {
    providedKey = apiKey;
  } else if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  }

  if (!providedKey || providedKey !== expectedKey) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
