import { FastifyRequest, FastifyReply } from 'fastify';
import { authService, JwtPayload } from '../services/auth.service';
import { UserRole } from '@ecomspace/shared';

// Расширяем Fastify Request чтобы хранить данные пользователя
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: JwtPayload;
  }
}

/**
 * Middleware: требует валидный JWT access token.
 * Устанавливает request.currentUser.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Authorization required' });
  }

  const token = header.slice(7);
  const payload = authService.verifyAccessToken(token);

  if (!payload) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  request.currentUser = payload;
}

/**
 * Middleware: требует роль ADMIN.
 * Должен вызываться ПОСЛЕ requireAuth.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.currentUser) {
    return reply.status(401).send({ error: 'Authorization required' });
  }

  if (request.currentUser.role !== UserRole.ADMIN) {
    return reply.status(403).send({ error: 'Admin access required' });
  }
}
