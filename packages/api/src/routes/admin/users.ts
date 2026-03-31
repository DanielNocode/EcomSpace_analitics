import { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { authService } from '../../services/auth.service';
import { prisma } from '../../lib/prisma';
import { createUserSchema, updateUserSchema, banUserSchema } from '../../lib/validation';
import { UserRole } from '@ecomspace/shared';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  banned: true,
  bannedAt: true,
  banReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

function formatUser(user: any) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    bannedAt: user.bannedAt?.toISOString() ?? null,
  };
}

export async function adminUserRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireAdmin);

  // ── GET / — список пользователей ──
  app.get('/', async (_request, reply) => {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(users.map(formatUser));
  });

  // ── GET /:id — один пользователь ──
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await prisma.user.findUnique({ where: { id }, select: userSelect });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.send(formatUser(user));
  });

  // ── POST / — создать пользователя ──
  app.post('/', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return reply.status(409).send({ error: 'User with this email already exists' });
    }

    const passwordHash = await authService.hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        password: passwordHash,
        role: parsed.data.role,
      },
      select: userSelect,
    });

    return reply.status(201).send(formatUser(user));
  });

  // ── PUT /:id — обновить пользователя ──
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateUserSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (parsed.data.email && parsed.data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (emailTaken) {
        return reply.status(409).send({ error: 'Email already taken' });
      }
    }

    const updateData: Record<string, any> = {};
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email;
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
    if (parsed.data.password) {
      updateData.password = await authService.hashPassword(parsed.data.password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });

    return reply.send(formatUser(user));
  });

  // ── DELETE /:id — деактивировать пользователя (soft delete) ──
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.currentUser!.userId;

    if (id === currentUserId) {
      return reply.status(400).send({ error: 'Cannot deactivate yourself' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return reply.send({ message: 'User deactivated' });
  });

  // ── POST /:id/ban — забанить пользователя ──
  app.post('/:id/ban', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.currentUser!.userId;

    if (id === currentUserId) {
      return reply.status(400).send({ error: 'Cannot ban yourself' });
    }

    const parsed = banUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (existing.banned) {
      return reply.status(400).send({ error: 'User is already banned' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        banned: true,
        bannedAt: new Date(),
        banReason: parsed.data.reason ?? null,
      },
      select: userSelect,
    });

    return reply.send(formatUser(user));
  });

  // ── POST /:id/unban — разбанить пользователя ──
  app.post('/:id/unban', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (!existing.banned) {
      return reply.status(400).send({ error: 'User is not banned' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        banned: false,
        bannedAt: null,
        banReason: null,
      },
      select: userSelect,
    });

    return reply.send(formatUser(user));
  });
}
