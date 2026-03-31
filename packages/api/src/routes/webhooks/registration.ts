import { FastifyInstance } from 'fastify';
import { apiKeyMiddleware } from '../../middleware/api-key';
import { webhookLogService } from '../../services/webhook-log.service';
import { contactService } from '../../services/contact.service';
import { webinarService } from '../../services/webinar.service';
import { registrationSchema } from '../../lib/validation';
import { prisma } from '../../lib/prisma';

export async function registrationRoute(app: FastifyInstance): Promise<void> {
  app.post('/registration', { preHandler: [apiKeyMiddleware] }, async (request, reply) => {
    const logId = await webhookLogService.log('registration', request.body);

    try {
      const parsed = registrationSchema.safeParse(request.body);
      if (!parsed.success) {
        await webhookLogService.markFailed(logId, parsed.error.message);
        return reply.status(422).send({ error: parsed.error.message });
      }
      const payload = parsed.data;

      // Validate at least one identifier
      if (!payload.gc_user_id && !payload.email && !payload.phone) {
        await webhookLogService.markFailed(logId, 'At least one identifier required');
        return reply.status(422).send({ error: 'At least one identifier (gc_user_id, email, or phone) is required' });
      }

      const contact = await contactService.findOrCreate({
        gc_user_id: payload.gc_user_id,
        email: payload.email,
        phone: payload.phone,
        name: payload.name,
      });

      const webinar = await webinarService.findOrCreateByDate(payload.webinar_date);

      // Check for duplicate registration (same contact, same webinar)
      const existingReg = await prisma.registration.findFirst({
        where: { contactId: contact.id, webinarId: webinar.id },
      });

      const isDuplicate = existingReg !== null;

      const registration = await prisma.registration.upsert({
        where: { gcDealId: payload.gc_deal_id },
        create: {
          contactId: contact.id,
          webinarId: webinar.id,
          gcDealId: payload.gc_deal_id,
          funnel: payload.funnel ?? null,
          isDuplicate,
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
          funnel: payload.funnel ?? null,
          utmSource: payload.utm_source ?? null,
          utmMedium: payload.utm_medium ?? null,
          utmCampaign: payload.utm_campaign ?? null,
          utmContent: payload.utm_content ?? null,
          utmTerm: payload.utm_term ?? null,
          customLabels: payload.custom_labels ?? undefined,
          registeredAt: new Date(payload.registered_at),
        },
      });

      await webhookLogService.markProcessed(logId);

      return reply.status(201).send({
        id: registration.id,
        contact_id: contact.id,
        webinar_id: webinar.id,
        funnel: registration.funnel,
        is_duplicate: isDuplicate,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await webhookLogService.markFailed(logId, message);
      throw err;
    }
  });
}
