import { FastifyInstance } from 'fastify';
import { apiKeyMiddleware } from '../../middleware/api-key';
import { webhookLogService } from '../../services/webhook-log.service';
import { contactService } from '../../services/contact.service';
import { webinarService } from '../../services/webinar.service';
import { attendanceSchema } from '../../lib/validation';
import { prisma } from '../../lib/prisma';

export async function attendanceRoute(app: FastifyInstance): Promise<void> {
  app.post(
    '/attendance',
    { preHandler: [apiKeyMiddleware] },
    async (request, reply) => {
      const logId = await webhookLogService.log('attendance', request.body);

      try {
        const parsed = attendanceSchema.safeParse(request.body);
        if (!parsed.success) {
          await webhookLogService.markFailed(logId, parsed.error.message);
          return reply.status(422).send({ error: parsed.error.message });
        }
        const payload = parsed.data;

        // Require at least one identifier
        if (!payload.gc_user_id && !payload.email && !payload.phone) {
          await webhookLogService.markFailed(logId, 'At least one identifier required');
          return reply.status(422).send({
            error: 'At least one identifier (gc_user_id, email, or phone) is required',
          });
        }

        const contact = await contactService.findOrCreate({
          gc_user_id: payload.gc_user_id,
          email: payload.email,
          phone: payload.phone,
        });

        const webinar = await webinarService.findByAttendanceDate(payload.attended_at);

        const attendance = await prisma.attendance.upsert({
          where: { gcDealId: payload.gc_deal_id },
          create: {
            contactId: contact.id,
            webinarId: webinar.id,
            gcDealId: payload.gc_deal_id,
            attendedAt: new Date(payload.attended_at),
            durationMinutes: payload.duration_minutes ?? null,
          },
          update: {
            contactId: contact.id,
            webinarId: webinar.id,
            attendedAt: new Date(payload.attended_at),
            durationMinutes: payload.duration_minutes ?? undefined,
          },
        });

        await webhookLogService.markProcessed(logId);

        return reply.status(201).send({
          id: attendance.id,
          contact_id: contact.id,
          webinar_id: webinar.id,
          duration_minutes: attendance.durationMinutes,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await webhookLogService.markFailed(logId, message);
        throw err;
      }
    },
  );
}
