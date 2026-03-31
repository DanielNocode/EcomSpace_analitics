import { prisma } from '../lib/prisma';

type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

interface AnomalyData {
  type: string;
  severity: AnomalySeverity;
  message: string;
  metadata?: any;
  webinarId?: string;
}

class AnomalyService {
  /**
   * Run all anomaly checks and store new anomalies.
   */
  async detectAll(): Promise<AnomalyData[]> {
    const detected: AnomalyData[] = [];

    const [reachAnomalies, paymentAnomalies, spikeAnomalies] = await Promise.all([
      this.checkReachRateDrop(),
      this.checkZeroPaymentsWithOrders(),
      this.checkRegistrationSpikes(),
    ]);

    detected.push(...reachAnomalies, ...paymentAnomalies, ...spikeAnomalies);

    // Store all detected anomalies
    if (detected.length > 0) {
      await prisma.anomaly.createMany({
        data: detected.map((a) => ({
          type: a.type,
          severity: a.severity,
          message: a.message,
          metadata: a.metadata ?? null,
          webinarId: a.webinarId ?? null,
        })),
      });
    }

    return detected;
  }

  /**
   * Check for reach rate drops below threshold.
   * Threshold: 20% (attendance / registrations)
   */
  async checkReachRateDrop(): Promise<AnomalyData[]> {
    const setting = await prisma.setting.findUnique({
      where: { key: 'anomaly_reach_threshold' },
    });
    const threshold = parseFloat(setting?.value ?? '20');

    // Get webinars from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const webinars = await prisma.webinar.findMany({
      where: { scheduledAt: { gte: thirtyDaysAgo } },
      include: {
        _count: { select: { registrations: true, attendances: true } },
      },
    });

    const anomalies: AnomalyData[] = [];

    for (const webinar of webinars) {
      const regs = webinar._count.registrations;
      const atts = webinar._count.attendances;
      if (regs < 10) continue; // Skip webinars with too few registrations

      const reachRate = regs > 0 ? (atts / regs) * 100 : 0;

      if (reachRate < threshold && reachRate > 0) {
        // Check if we already detected this recently
        const recent = await prisma.anomaly.findFirst({
          where: {
            type: 'low_reach_rate',
            webinarId: webinar.id,
            detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!recent) {
          anomalies.push({
            type: 'low_reach_rate',
            severity: reachRate < 10 ? 'HIGH' : 'MEDIUM',
            message: `Доходимость на вебинар ${webinar.title ?? webinar.scheduledAt.toISOString()} составляет ${reachRate.toFixed(1)}% (порог: ${threshold}%)`,
            metadata: {
              webinarDate: webinar.scheduledAt.toISOString(),
              registrations: regs,
              attendances: atts,
              reachRate: Math.round(reachRate * 100) / 100,
              threshold,
            },
            webinarId: webinar.id,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Check for webinars with orders but zero payments (in last 7 days).
   */
  async checkZeroPaymentsWithOrders(): Promise<AnomalyData[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const webinars = await prisma.webinar.findMany({
      where: { scheduledAt: { gte: sevenDaysAgo } },
    });

    const anomalies: AnomalyData[] = [];

    for (const webinar of webinars) {
      const [orders, payments] = await Promise.all([
        prisma.order.count({ where: { attributedWebinarId: webinar.id } }),
        prisma.order.count({ where: { attributedWebinarId: webinar.id, status: 'PAID' } }),
      ]);

      if (orders > 5 && payments === 0) {
        const recent = await prisma.anomaly.findFirst({
          where: {
            type: 'zero_payments',
            webinarId: webinar.id,
            detectedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

        if (!recent) {
          anomalies.push({
            type: 'zero_payments',
            severity: 'HIGH',
            message: `Вебинар ${webinar.title ?? webinar.scheduledAt.toISOString()}: ${orders} заказов, но 0 оплат`,
            metadata: {
              webinarDate: webinar.scheduledAt.toISOString(),
              orders,
              payments,
            },
            webinarId: webinar.id,
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Check for registration spikes from a single source.
   * A spike is when >80% of registrations come from a single UTM source.
   */
  async checkRegistrationSpikes(): Promise<AnomalyData[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get recent registrations
    const recentRegs = await prisma.registration.count({
      where: { registeredAt: { gte: oneDayAgo } },
    });

    if (recentRegs < 20) return []; // Not enough registrations to detect spikes

    const bySource = await prisma.registration.groupBy({
      by: ['utmSource'],
      where: { registeredAt: { gte: oneDayAgo } },
      _count: true,
    });

    const anomalies: AnomalyData[] = [];

    for (const source of bySource) {
      const pct = (source._count / recentRegs) * 100;
      if (pct > 80 && source._count > 15) {
        const recent = await prisma.anomaly.findFirst({
          where: {
            type: 'registration_spike',
            detectedAt: { gte: oneDayAgo },
            metadata: { path: ['utmSource'], equals: source.utmSource },
          },
        });

        if (!recent) {
          anomalies.push({
            type: 'registration_spike',
            severity: 'MEDIUM',
            message: `Всплеск регистраций из источника "${source.utmSource ?? 'unknown'}": ${source._count} из ${recentRegs} (${pct.toFixed(0)}%) за 24 часа`,
            metadata: {
              utmSource: source.utmSource,
              count: source._count,
              total: recentRegs,
              percentage: Math.round(pct),
            },
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * List recent anomalies.
   */
  async listAnomalies(opts: {
    resolved?: boolean;
    limit?: number;
    webinarId?: string;
  } = {}) {
    return prisma.anomaly.findMany({
      where: {
        resolved: opts.resolved ?? false,
        ...(opts.webinarId ? { webinarId: opts.webinarId } : {}),
      },
      orderBy: { detectedAt: 'desc' },
      take: opts.limit ?? 50,
    });
  }

  /**
   * Resolve an anomaly.
   */
  async resolve(id: string) {
    return prisma.anomaly.update({
      where: { id },
      data: { resolved: true },
    });
  }
}

export const anomalyService = new AnomalyService();
