import { FastifyInstance } from 'fastify';
import { apiKeyMiddleware } from '../../middleware/api-key';
import { parseBizonXlsx, storeBizonReport } from '../../services/bizon-report.service';
import { prisma } from '../../lib/prisma';
import { getBizonAnalytics } from '../../services/bizon-report.service';
import { requireAuth } from '../../middleware/auth';

export async function bizonReportRoute(app: FastifyInstance): Promise<void> {
  // ── POST /bizon-report — upload and parse Bizon365 XLSX report ──
  app.post(
    '/bizon-report',
    { preHandler: [apiKeyMiddleware] },
    async (request, reply) => {
      try {
        let buffer: Buffer | null = null;
        let fileName: string | undefined;

        // Support multipart file upload
        if (request.isMultipart()) {
          const parts = request.parts();
          for await (const part of parts) {
            if (part.type === 'file') {
              const chunks: Buffer[] = [];
              for await (const chunk of part.file) {
                chunks.push(chunk);
              }
              buffer = Buffer.concat(chunks);
              fileName = part.filename;
              break;
            }
          }
        }

        // Support base64 encoded file in JSON body
        if (!buffer) {
          const body = request.body as any;
          if (body?.file_base64) {
            buffer = Buffer.from(body.file_base64, 'base64');
            fileName = body.file_name ?? 'report.xlsx';
          }
        }

        if (!buffer) {
          return reply.status(400).send({
            error: 'No file provided. Use multipart upload or base64 encoded file in JSON body.',
          });
        }

        const parsed = await parseBizonXlsx(buffer);
        const reportId = await storeBizonReport(parsed, fileName);

        return reply.status(201).send({
          reportId,
          webinarId: (await prisma.bizonReport.findUnique({ where: { id: reportId } }))?.webinarId,
          summary: {
            roomId: parsed.summary.roomId,
            roomTitle: parsed.summary.roomTitle,
            startedAt: parsed.summary.startedAt.toISOString(),
            durationMinutes: parsed.summary.durationMinutes,
            totalViewers: parsed.summary.totalViewers,
            peakViewers: parsed.summary.peakViewers,
            commentsCount: parsed.chatMessages.length,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.status(500).send({ error: `Failed to process report: ${message}` });
      }
    },
  );

  // ── GET /bizon-report/:id — get report analytics ──
  app.get(
    '/bizon-report/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const analytics = await getBizonAnalytics(id);

      if (!analytics) {
        return reply.status(404).send({ error: 'Report not found' });
      }

      return reply.send(analytics);
    },
  );

  // ── DELETE /bizon-report/:id — delete a report and all related data ──
  app.delete(
    '/bizon-report/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const report = await prisma.bizonReport.findUnique({ where: { id } });
      if (!report) {
        return reply.status(404).send({ error: 'Report not found' });
      }

      // Delete related records first, then the report
      await prisma.bizonChatMessage.deleteMany({ where: { reportId: id } });
      await prisma.bizonReportViewer.deleteMany({ where: { reportId: id } });
      await prisma.bizonReport.delete({ where: { id } });

      return reply.send({ ok: true, deleted: id });
    },
  );

  // ── GET /bizon-report — list all reports ──
  app.get(
    '/bizon-report',
    { preHandler: [requireAuth] },
    async (_request, reply) => {
      const reports = await prisma.bizonReport.findMany({
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          webinarId: true,
          roomId: true,
          roomTitle: true,
          startedAt: true,
          durationMinutes: true,
          peakViewers: true,
          totalViewers: true,
          commentsCount: true,
          avgWatchPercent: true,
          createdAt: true,
        },
      });

      return reply.send(
        reports.map((r) => ({
          ...r,
          startedAt: r.startedAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
        })),
      );
    },
  );
}
