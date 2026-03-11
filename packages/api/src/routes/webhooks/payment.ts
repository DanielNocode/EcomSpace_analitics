import { FastifyInstance } from 'fastify';
import { Decimal } from '@prisma/client/runtime/library';
import { apiKeyMiddleware } from '../../middleware/api-key';
import { webhookLogService } from '../../services/webhook-log.service';
import { contactService } from '../../services/contact.service';
import { attributionService } from '../../services/attribution.service';
import { paymentSchema } from '../../lib/validation';
import { prisma } from '../../lib/prisma';
import type { AttributionType } from '@prisma/client';

export async function paymentRoute(app: FastifyInstance): Promise<void> {
  app.post(
    '/payment',
    { preHandler: [apiKeyMiddleware] },
    async (request, reply) => {
      const logId = await webhookLogService.log('payment', request.body);

      try {
        const parsed = paymentSchema.safeParse(request.body);
        if (!parsed.success) {
          await webhookLogService.markFailed(logId, parsed.error.message);
          return reply.status(422).send({ error: parsed.error.message });
        }
        const payload = parsed.data;

        // Determine scenario
        const isScenarioA = !payload.amount && !payload.gc_user_id && !payload.email;

        if (isScenarioA) {
          // Scenario A: Stage change — find existing order by gc_deal_id, update status
          const existingOrder = await prisma.order.findUnique({
            where: { gcDealId: payload.gc_deal_id },
          });

          if (!existingOrder) {
            await webhookLogService.markFailed(logId, `Order not found for gc_deal_id: ${payload.gc_deal_id}`);
            return reply.status(422).send({
              error: `Order not found for gc_deal_id: ${payload.gc_deal_id}`,
            });
          }

          const updated = await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              status: 'PAID',
              paidAt: new Date(payload.paid_at),
            },
          });

          await webhookLogService.markProcessed(logId);

          return reply.status(200).send({
            id: updated.id,
            status: updated.status,
          });
        }

        // Scenario B: New deal with amount — find contact, match or create order
        const contact = await contactService.findOrCreate({
          gc_user_id: payload.gc_user_id,
          email: payload.email,
        });

        // Try to find the latest unpaid order for this contact
        const unpaidOrder = await prisma.order.findFirst({
          where: {
            contactId: contact.id,
            status: 'NEW',
          },
          orderBy: { orderedAt: 'desc' },
        });

        if (unpaidOrder) {
          // Update existing order to PAID
          const updated = await prisma.order.update({
            where: { id: unpaidOrder.id },
            data: {
              status: 'PAID',
              paidAt: new Date(payload.paid_at),
              amount: payload.amount != null ? new Decimal(payload.amount) : unpaidOrder.amount,
            },
          });

          await webhookLogService.markProcessed(logId);

          return reply.status(200).send({
            id: updated.id,
            status: updated.status,
          });
        }

        // No unpaid order found — create a new PAID order with attribution
        const attribution = await attributionService.attribute(
          contact,
          new Date(payload.paid_at),
        );

        const newOrder = await prisma.order.upsert({
          where: { gcDealId: payload.gc_deal_id },
          create: {
            contactId: contact.id,
            gcDealId: payload.gc_deal_id,
            attributedWebinarId: attribution.webinarId,
            lastAttendanceId: attribution.attendanceId,
            attributionType: attribution.type as AttributionType,
            amount: payload.amount != null ? new Decimal(payload.amount) : null,
            productName: payload.product_name ?? null,
            orderedAt: new Date(payload.paid_at),
            paidAt: new Date(payload.paid_at),
            status: 'PAID',
          },
          update: {
            status: 'PAID',
            paidAt: new Date(payload.paid_at),
            amount: payload.amount != null ? new Decimal(payload.amount) : null,
          },
        });

        await webhookLogService.markProcessed(logId);

        return reply.status(200).send({
          id: newOrder.id,
          status: newOrder.status,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await webhookLogService.markFailed(logId, message);
        throw err;
      }
    },
  );
}
