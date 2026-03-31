import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { loginSchema, refreshSchema, changePasswordSchema } from '../lib/validation';
import { prisma } from '../lib/prisma';
import { UserRole } from '@ecomspace/shared';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /login ──
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await authService.login(parsed.data.email, parsed.data.password);

    if (!result.ok) {
      if (result.reason === 'banned') {
        return reply.status(403).send({
          error: 'Account banned',
          reason: result.banReason ?? 'No reason provided',
        });
      }
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return reply.send({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: {
        ...user,
        role: user!.role as UserRole,
        createdAt: user!.createdAt.toISOString(),
      },
    });
  });

  // ── POST /refresh ──
  app.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const tokens = await authService.refresh(parsed.data.refreshToken);

    if (!tokens) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    return reply.send(tokens);
  });

  // ── GET /me ──
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.currentUser!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        banned: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({
      ...user,
      role: user.role as UserRole,
      createdAt: user.createdAt.toISOString(),
    });
  });

  // ── PUT /change-password ──
  app.put('/change-password', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const result = await authService.changePassword(
      request.currentUser!.userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    if (!result.ok) {
      if (result.reason === 'invalid_password') {
        return reply.status(400).send({ error: 'Current password is incorrect' });
      }
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send({ message: 'Password changed successfully' });
  });
}
