import { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';
import { apiKeyMiddleware } from '../../middleware/api-key';
import { webhookLogService } from '../../services/webhook-log.service';
import { contactService } from '../../services/contact.service';
import { attributionService } from '../../services/attribution.service';
import { orderSchema } from '../../lib/validation';
import { prisma } from '../../lib/prisma';
import type { AttributionType } from '@prisma/client';

export async function orderRoute(app: FastifyInstance): Promise<void> {
  app.post(
    '/order',
    { preHandler: [apiKeyMiddleware] },
    async (request, reply) => {
      const logId = await webhookLogService.log('order', request.body);

      try {
        const parsed = orderSchema.safeParse(request.body);
        if (!parsed.success) {
          await webhookLogService.markFailed(logId, parsed.error.message);
          return reply.status(422).send({ error: parsed.error.message });
        }
        const payload = parsed.data;

        const contact = await contactService.findOrCreate({
          gc_user_id: payload.gc_user_id,
          email: payload.email,
        });

        // Run attribution algorithm
        const attribution = await attributionService.attribute(
          contact,
          new Date(payload.ordered_at),
        );

        const order = await prisma.order.upsert({
          where: { gcDealId: payload.gc_deal_id },
          create: {
            contactId: contact.id,
            gcDealId: payload.gc_deal_id,
            attributedWebinarId: attribution.webinarId,
            lastAttendanceId: attribution.attendanceId,
            attributionType: attribution.type as AttributionType,
            amount: payload.amount != null ? new Decimal(payload.amount) : null,
            productName: payload.product_name ?? null,
            orderedAt: new Date(payload.ordered_at),
            status: 'NEW',
          },
          update: {
            contactId: contact.id,
            attributedWebinarId: attribution.webinarId,
            lastAttendanceId: attribution.attendanceId,
            attributionType: attribution.type as AttributionType,
            amount: payload.amount != null ? new Decimal(payload.amount) : null,
            productName: payload.product_name ?? null,
            orderedAt: new Date(payload.ordered_at),
          },
        });

        await webhookLogService.markProcessed(logId);

        return reply.status(201).send({
          id: order.id,
          attribution_type: order.attributionType,
          attributed_webinar_id: order.attributedWebinarId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await webhookLogService.markFailed(logId, message);
        throw err;
      }
    },
  );
}
