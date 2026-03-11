import { FastifyInstance } from 'fastify';
import { apiKeyMiddleware } from '../../middleware/api-key';
import { webhookLogService } from '../../services/webhook-log.service';
import { contactService } from '../../services/contact.service';
import { webinarService } from '../../services/webinar.service';
import { registrationSchema } from '../../lib/validation';
import { prisma } from '../../lib/prisma';

export async function registrationRoute(app: FastifyInstance): Promise<void> {
  app.post(
    '/registration',
    { preHandler: [apiKeyMiddleware] },
    async (request, reply) => {
      // 1. Log webhook
      const logId = await webhookLogService.log('registration', request.body);

      try {
        // 2. Validate payload
        const parsed = registrationSchema.safeParse(request.body);
        if (!parsed.success) {
          await webhookLogService.markFailed(logId, parsed.error.message);
          return reply.status(422).send({ error: parsed.error.message });
        }
        const payload = parsed.data;

        // 3. Find or create contact
        const contact = await contactService.findOrCreate({
          gc_user_id: payload.gc_user_id,
          email: payload.email,
          phone: payload.phone,
          name: payload.name,
        });

        // 4. Determine webinar by registration window
        const webinar = await webinarService.findByRegWindow(payload.registered_at);

        // 5. Upsert registration by gc_deal_id (idempotency)
        const registration = await prisma.registration.upsert({
          where: { gcDealId: payload.gc_deal_id },
          create: {
            contactId: contact.id,
            webinarId: webinar.id,
            gcDealId: payload.gc_deal_id,
            utmSource: payload.utm_source ?? null,
            utmMedium: payload.utm_medium ?? null,
            utmCampaign: payload.utm_campaign ?? null,
            utmContent: payload.utm_content ?? null,
            utmTerm: payload.utm_term ?? null,
            customLabels: payload.custom_labels ?? undefined,
            registeredAt: new Date(payload.registered_at),
          },
          update: {
            contactId: contact.id,
            webinarId: webinar.id,
            utmSource: payload.utm_source ?? null,
            utmMedium: payload.utm_medium ?? null,
            utmCampaign: payload.utm_campaign ?? null,
            utmContent: payload.utm_content ?? null,
            utmTerm: payload.utm_term ?? null,
            customLabels: payload.custom_labels ?? undefined,
            registeredAt: new Date(payload.registered_at),
          },
        });

        // 6. Mark webhook as processed
        await webhookLogService.markProcessed(logId);

        // 7. Return response
        return reply.status(201).send({
          id: registration.id,
          contact_id: contact.id,
          webinar_id: webinar.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await webhookLogService.markFailed(logId, message);
        throw err;
      }
    },
  );
}
