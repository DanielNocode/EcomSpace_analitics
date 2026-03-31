import { FastifyInstance } from 'fastify';
import { analyticsService, getDeadLeads, getTimeToAction } from './analytics.service';
import { parseFilterFromQuery } from '../../lib/filter-builder';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { anomalyService } from '../../services/anomaly.service';

export async function registerCoreRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // ── GET /overview ──
  app.get('/overview', async (request, reply) => {
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const overview = await analyticsService.getOverview(filter);
    return reply.send(overview);
  });

  // ── POST /overview ──
  app.post('/overview', async (request, reply) => {
    const filter = request.body as any;
    const overview = await analyticsService.getOverview(filter);
    return reply.send(overview);
  });

  // ── GET /webinars ──
  app.get('/webinars', async (request, reply) => {
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const webinars = await analyticsService.getWebinars(filter);
    return reply.send(webinars);
  });

  // ── GET /webinars/:id ──
  app.get('/webinars/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = await analyticsService.getWebinarDetail(id);
    if (!detail) return reply.status(404).send({ error: 'Webinar not found' });
    return reply.send(detail);
  });

  // ── GET /webinars/:id/funnel ──
  app.get('/webinars/:id/funnel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const funnel = await analyticsService.getWebinarFunnel(id, filter);
    return reply.send(funnel);
  });

  // ── GET /webinars/:id/by-source ──
  app.get('/webinars/:id/by-source', async (request, reply) => {
    const { id } = request.params as { id: string };
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const sources = await analyticsService.getWebinarBySource(id, filter);
    return reply.send(sources);
  });

  // ── GET /webinars/:id/participants ──
  app.get('/webinars/:id/participants', async (request, reply) => {
    const { id } = request.params as { id: string };
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const participants = await analyticsService.getWebinarParticipants(id, filter);
    return reply.send(participants);
  });

  // ── GET /deferred ──
  app.get('/deferred', async (request, reply) => {
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const deferred = await analyticsService.getDeferredPayments(filter);
    return reply.send(deferred);
  });

  // ── GET /filter-options ──
  app.get('/filter-options', async (_request, reply) => {
    const options = await analyticsService.getFilterOptions();
    return reply.send(options);
  });

  // ── GET /settings ──
  app.get('/settings', async (_request, reply) => {
    const settings = await analyticsService.getSettings();
    return reply.send(settings);
  });

  // ── PUT /settings/:key ──
  app.put('/settings/:key', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: string };
    if (!value) return reply.status(422).send({ error: 'Value is required' });
    const setting = await analyticsService.updateSetting(key, value);
    return reply.send({ key: setting.key, value: setting.value });
  });

  // ── GET /dead-leads ──
  app.get('/dead-leads', async (request, reply) => {
    const q = request.query as Record<string, any>;
    const leads = await getDeadLeads({
      daysSince: q.daysSince ? parseInt(q.daysSince, 10) : 7,
      funnel: q.funnel,
      utmSource: q.utmSource,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    });
    return reply.send(leads);
  });

  // ── GET /time-to-action ──
  app.get('/time-to-action', async (request, reply) => {
    const filter = parseFilterFromQuery(request.query as Record<string, any>);
    const stats = await getTimeToAction(filter);
    return reply.send(stats);
  });

  // ── GET /anomalies ──
  app.get('/anomalies', async (request, reply) => {
    const q = request.query as Record<string, any>;
    const anomalies = await anomalyService.listAnomalies({
      resolved: q.resolved === 'true',
      limit: q.limit ? parseInt(q.limit, 10) : 50,
      webinarId: q.webinarId,
    });
    return reply.send(
      anomalies.map((a) => ({
        ...a,
        detectedAt: a.detectedAt.toISOString(),
      })),
    );
  });

  // ── POST /anomalies/detect ──
  app.post('/anomalies/detect', { preHandler: [requireAdmin] }, async (_request, reply) => {
    const detected = await anomalyService.detectAll();
    return reply.send({ detected: detected.length, anomalies: detected });
  });

  // ── PUT /anomalies/:id/resolve ──
  app.put('/anomalies/:id/resolve', { preHandler: [requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const anomaly = await anomalyService.resolve(id);
    return reply.send({ ...anomaly, detectedAt: anomaly.detectedAt.toISOString() });
  });
}
