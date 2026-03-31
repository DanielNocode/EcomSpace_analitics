import { prisma } from '../../lib/prisma';
import {
  buildRegistrationWhere,
  buildWebinarWhere,
  buildOrderWhere,
} from '../../lib/filter-builder';
import { bizonReportService } from '../../services/bizon-report.service';

interface AnalyticsFilter {
  dateFrom?: string;
  dateTo?: string;
  webinarId?: string;
  funnel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  customLabels?: Record<string, string>;
  advanced?: any;
}

export const analyticsService = {
  // ── Overview ──
  async getOverview(filter: AnalyticsFilter) {
    const regWhere = buildRegistrationWhere(filter);
    const orderWhere = buildOrderWhere(filter);

    const [totalRegistrations, totalAttendances, totalOrders, totalPayments, revenueResult] = await Promise.all([
      prisma.registration.count({ where: { ...regWhere, isDuplicate: false } }),
      prisma.attendance.count({
        where: {
          ...(filter.webinarId ? { webinarId: filter.webinarId } : {}),
          ...(filter.dateFrom || filter.dateTo ? {
            attendedAt: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
            },
          } : {}),
        },
      }),
      prisma.order.count({ where: orderWhere }),
      prisma.order.count({ where: { ...orderWhere, status: 'PAID' } }),
      prisma.order.aggregate({ where: { ...orderWhere, status: 'PAID' }, _sum: { amount: true } }),
    ]);

    const totalRevenue = revenueResult._sum.amount ? Number(revenueResult._sum.amount) : 0;

    return {
      totalRegistrations,
      totalAttendances,
      totalOrders,
      totalPayments,
      totalRevenue,
      reachRate: totalRegistrations > 0 ? Math.round((totalAttendances / totalRegistrations) * 10000) / 100 : 0,
      conversionRate: totalAttendances > 0 ? Math.round((totalPayments / totalAttendances) * 10000) / 100 : 0,
    };
  },

  // ── Webinars list ──
  async getWebinars(filter: AnalyticsFilter) {
    const webinarWhere = buildWebinarWhere(filter);
    const webinars = await prisma.webinar.findMany({
      where: webinarWhere,
      orderBy: { scheduledAt: 'desc' },
      include: { _count: { select: { registrations: true, attendances: true } } },
    });

    const webinarIds = webinars.map((w) => w.id);
    const orderStats = await prisma.order.groupBy({
      by: ['attributedWebinarId'],
      where: { attributedWebinarId: { in: webinarIds } },
      _count: true,
    });
    const paidStats = await prisma.order.groupBy({
      by: ['attributedWebinarId'],
      where: { attributedWebinarId: { in: webinarIds }, status: 'PAID' },
      _count: true,
      _sum: { amount: true },
    });

    const orderMap = new Map(orderStats.map((o) => [o.attributedWebinarId, o._count]));
    const paidMap = new Map(paidStats.map((p) => [p.attributedWebinarId, { count: p._count, revenue: Number(p._sum.amount ?? 0) }]));

    return webinars.map((w) => {
      const regs = w._count.registrations;
      const atts = w._count.attendances;
      const orders = orderMap.get(w.id) ?? 0;
      const paid = paidMap.get(w.id);
      const payments = paid?.count ?? 0;
      const revenue = paid?.revenue ?? 0;

      return {
        id: w.id,
        scheduledAt: w.scheduledAt.toISOString(),
        title: w.title,
        status: w.status,
        registrations: regs,
        attendances: atts,
        orders,
        payments,
        revenue,
        reachRate: regs > 0 ? Math.round((atts / regs) * 10000) / 100 : 0,
        conversionRate: atts > 0 ? Math.round((payments / atts) * 10000) / 100 : 0,
      };
    });
  },

  // ── Webinar detail ──
  async getWebinarDetail(webinarId: string) {
    const webinar = await prisma.webinar.findUnique({ where: { id: webinarId } });
    if (!webinar) return null;

    const [regs, atts, orders, paidOrders, revenueResult] = await Promise.all([
      prisma.registration.count({ where: { webinarId, isDuplicate: false } }),
      prisma.attendance.count({ where: { webinarId } }),
      prisma.order.count({ where: { attributedWebinarId: webinarId } }),
      prisma.order.count({ where: { attributedWebinarId: webinarId, status: 'PAID' } }),
      prisma.order.aggregate({ where: { attributedWebinarId: webinarId, status: 'PAID' }, _sum: { amount: true } }),
    ]);

    const revenue = revenueResult._sum.amount ? Number(revenueResult._sum.amount) : 0;

    // Try to get Bizon report data
    const bizonReports = await bizonReportService.getReportsByWebinar(webinarId);

    return {
      webinar: {
        id: webinar.id,
        scheduledAt: webinar.scheduledAt.toISOString(),
        title: webinar.title,
        status: webinar.status,
      },
      stats: {
        registrations: regs,
        attendances: atts,
        orders,
        payments: paidOrders,
        revenue,
        reachRate: regs > 0 ? Math.round((atts / regs) * 10000) / 100 : 0,
        conversionRate: atts > 0 ? Math.round((paidOrders / atts) * 10000) / 100 : 0,
        orderRate: atts > 0 ? Math.round((orders / atts) * 10000) / 100 : 0,
        paymentRate: orders > 0 ? Math.round((paidOrders / orders) * 10000) / 100 : 0,
      },
      bizonReport: bizonReports[0] ? {
        id: bizonReports[0].id,
        peakViewers: bizonReports[0].peakViewers,
        totalViewers: bizonReports[0].totalViewers,
        durationMinutes: bizonReports[0].durationMinutes,
        avgWatchPercent: bizonReports[0].avgWatchPercent,
        commentsCount: bizonReports[0].commentsCount,
      } : null,
    };
  },

  // ── Funnel ──
  async getWebinarFunnel(webinarId: string, filter: AnalyticsFilter) {
    const regWhere: any = { webinarId, isDuplicate: false };
    if (filter.funnel) regWhere.funnel = filter.funnel;
    if (filter.utmSource) regWhere.utmSource = filter.utmSource;
    if (filter.utmMedium) regWhere.utmMedium = filter.utmMedium;
    if (filter.utmCampaign) regWhere.utmCampaign = filter.utmCampaign;

    const [regs, atts, orders, payments] = await Promise.all([
      prisma.registration.count({ where: regWhere }),
      prisma.attendance.count({ where: { webinarId } }),
      prisma.order.count({ where: { attributedWebinarId: webinarId } }),
      prisma.order.count({ where: { attributedWebinarId: webinarId, status: 'PAID' } }),
    ]);

    return [
      { stage: 'Регистрации', count: regs, conversionFromPrev: null },
      { stage: 'Участия', count: atts, conversionFromPrev: regs > 0 ? Math.round((atts / regs) * 10000) / 100 : 0 },
      { stage: 'Заказы', count: orders, conversionFromPrev: atts > 0 ? Math.round((orders / atts) * 10000) / 100 : 0 },
      { stage: 'Оплаты', count: payments, conversionFromPrev: orders > 0 ? Math.round((payments / orders) * 10000) / 100 : 0 },
    ];
  },

  // ── By source ──
  async getWebinarBySource(webinarId: string, filter: AnalyticsFilter) {
    const regWhere: any = { webinarId };
    if (filter.funnel) regWhere.funnel = filter.funnel;

    const sourceGroups = await prisma.registration.groupBy({
      by: ['utmSource', 'utmMedium', 'utmCampaign', 'funnel'],
      where: regWhere,
      _count: true,
    });

    const result = await Promise.all(
      sourceGroups.map(async (group) => {
        const contactIds = await prisma.registration.findMany({
          where: { webinarId, utmSource: group.utmSource, utmMedium: group.utmMedium, utmCampaign: group.utmCampaign, funnel: group.funnel },
          select: { contactId: true },
          distinct: ['contactId'],
        });
        const ids = contactIds.map((c) => c.contactId);

        const [attendances, orders, paidOrders, revenueAgg] = await Promise.all([
          prisma.attendance.count({ where: { webinarId, contactId: { in: ids } } }),
          prisma.order.count({ where: { attributedWebinarId: webinarId, contactId: { in: ids } } }),
          prisma.order.count({ where: { attributedWebinarId: webinarId, contactId: { in: ids }, status: 'PAID' } }),
          prisma.order.aggregate({ where: { attributedWebinarId: webinarId, contactId: { in: ids }, status: 'PAID' }, _sum: { amount: true } }),
        ]);

        return {
          utmSource: group.utmSource, utmMedium: group.utmMedium, utmCampaign: group.utmCampaign, funnel: group.funnel,
          registrations: group._count, attendances, orders, payments: paidOrders,
          revenue: revenueAgg._sum.amount ? Number(revenueAgg._sum.amount) : 0,
        };
      }),
    );

    return result;
  },

  // ── Deferred payments ──
  async getDeferredPayments(filter: AnalyticsFilter) {
    const where: any = { attributionType: { in: ['DEFERRED', 'UNATTRIBUTED'] } };
    if (filter.dateFrom || filter.dateTo) {
      where.orderedAt = {};
      if (filter.dateFrom) where.orderedAt.gte = new Date(filter.dateFrom);
      if (filter.dateTo) where.orderedAt.lte = new Date(filter.dateTo);
    }

    const orders = await prisma.order.findMany({
      where,
      include: { contact: true, lastAttendance: { include: { webinar: true } } },
      orderBy: { orderedAt: 'desc' },
    });

    return orders.map((order) => {
      const lastWebinarDate = order.lastAttendance?.webinar?.scheduledAt ?? null;
      const daysSinceWebinar = lastWebinarDate ? Math.round((order.orderedAt.getTime() - lastWebinarDate.getTime()) / 86400000) : null;
      return {
        orderId: order.id, contactName: order.contact.name, contactEmail: order.contact.email,
        amount: order.amount ? Number(order.amount) : null, productName: order.productName,
        orderedAt: order.orderedAt.toISOString(), paidAt: order.paidAt?.toISOString() ?? null,
        lastWebinarDate: lastWebinarDate?.toISOString() ?? null, daysSinceWebinar, attributionType: order.attributionType,
      };
    });
  },

  // ── Participants ──
  async getWebinarParticipants(webinarId: string, filter: AnalyticsFilter) {
    const regWhere: any = { webinarId };
    if (filter.funnel) regWhere.funnel = filter.funnel;
    if (filter.utmSource) regWhere.utmSource = filter.utmSource;

    const registrations = await prisma.registration.findMany({
      where: regWhere, include: { contact: true }, orderBy: { registeredAt: 'desc' },
    });

    const contactIds = registrations.map((r) => r.contactId);
    const [attendances, orders] = await Promise.all([
      prisma.attendance.findMany({ where: { webinarId, contactId: { in: contactIds } }, select: { contactId: true, durationMinutes: true } }),
      prisma.order.findMany({ where: { attributedWebinarId: webinarId, contactId: { in: contactIds } }, select: { contactId: true, status: true } }),
    ]);

    const attendedMap = new Map(attendances.map((a) => [a.contactId, a.durationMinutes]));
    const orderedSet = new Set(orders.map((o) => o.contactId));
    const paidSet = new Set(orders.filter((o) => o.status === 'PAID').map((o) => o.contactId));

    return registrations.map((reg) => ({
      contactId: reg.contactId, name: reg.contact.name, email: reg.contact.email, phone: reg.contact.phone,
      funnel: reg.funnel, utmSource: reg.utmSource, registeredAt: reg.registeredAt.toISOString(),
      attended: attendedMap.has(reg.contactId), durationMinutes: attendedMap.get(reg.contactId) ?? null,
      ordered: orderedSet.has(reg.contactId), paid: paidSet.has(reg.contactId), isDuplicate: reg.isDuplicate,
    }));
  },

  // ── Time-to-action ──
  async getTimeToAction(filter: AnalyticsFilter) {
    const dateFilter: any = {};
    if (filter.dateFrom) dateFilter.gte = new Date(filter.dateFrom);
    if (filter.dateTo) dateFilter.lte = new Date(filter.dateTo);

    // Registration → Attendance
    const regToAtt = await prisma.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (a.attended_at - r.registered_at)) / 3600) as avg_hours
      FROM registrations r
      JOIN attendances a ON r.contact_id = a.contact_id AND r.webinar_id = a.webinar_id
      ${filter.dateFrom ? prisma.$queryRaw`WHERE r.registered_at >= ${new Date(filter.dateFrom)}` : prisma.$queryRaw``}
    `.catch(() => [{ avg_hours: null }]);

    // Attendance → Order
    const attToOrder = await prisma.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (o.ordered_at - a.attended_at)) / 3600) as avg_hours
      FROM attendances a
      JOIN orders o ON a.id = o.last_attendance_id
    `.catch(() => [{ avg_hours: null }]);

    // Order → Payment
    const orderToPay = await prisma.$queryRaw<Array<{ avg_hours: number }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (o.paid_at - o.ordered_at)) / 3600) as avg_hours
      FROM orders o WHERE o.paid_at IS NOT NULL AND o.status = 'PAID'
    `.catch(() => [{ avg_hours: null }]);

    return {
      registrationToAttendance: regToAtt[0]?.avg_hours ? Math.round(Number(regToAtt[0].avg_hours) * 10) / 10 : null,
      attendanceToOrder: attToOrder[0]?.avg_hours ? Math.round(Number(attToOrder[0].avg_hours) * 10) / 10 : null,
      orderToPayment: orderToPay[0]?.avg_hours ? Math.round(Number(orderToPay[0].avg_hours) * 10) / 10 : null,
    };
  },

  // ── Dead leads ──
  async getDeadLeads(filter: AnalyticsFilter) {
    const daysThreshold = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const where: any = {
      registeredAt: { lte: cutoffDate },
      contact: {
        attendances: { none: {} },
      },
    };

    if (filter.funnel) where.funnel = filter.funnel;
    if (filter.utmSource) where.utmSource = filter.utmSource;
    if (filter.dateFrom) where.registeredAt = { ...where.registeredAt, gte: new Date(filter.dateFrom) };

    const deadRegs = await prisma.registration.findMany({
      where,
      include: { contact: true, webinar: true },
      orderBy: { registeredAt: 'desc' },
      take: 500,
      distinct: ['contactId'],
    });

    return deadRegs.map((reg) => ({
      contactId: reg.contactId,
      name: reg.contact.name,
      email: reg.contact.email,
      phone: reg.contact.phone,
      registeredAt: reg.registeredAt.toISOString(),
      webinarTitle: reg.webinar.title,
      funnel: reg.funnel,
      daysSinceRegistration: Math.round((Date.now() - reg.registeredAt.getTime()) / 86400000),
    }));
  },

  // ── Anomalies ──
  async getAnomalies(resolved?: boolean) {
    const where: any = {};
    if (resolved !== undefined) where.resolved = resolved;

    return prisma.anomaly.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      take: 100,
    });
  },

  async resolveAnomaly(id: string) {
    return prisma.anomaly.update({
      where: { id },
      data: { resolved: true },
    });
  },

  // ── Bizon report endpoints ──
  async getBizonReports() {
    return bizonReportService.listReports();
  },

  async getBizonReport(reportId: string) {
    return bizonReportService.getReport(reportId);
  },

  async getBizonRetention(reportId: string) {
    return bizonReportService.getRetentionCurve(reportId);
  },

  async getBizonChat(reportId: string) {
    return bizonReportService.getChatAnalytics(reportId);
  },

  // ── Filter options ──
  async getFilterOptions() {
    const [funnels, utmSources, utmMediums, utmCampaigns] = await Promise.all([
      prisma.registration.findMany({ where: { funnel: { not: null } }, select: { funnel: true }, distinct: ['funnel'] }),
      prisma.registration.findMany({ where: { utmSource: { not: null } }, select: { utmSource: true }, distinct: ['utmSource'] }),
      prisma.registration.findMany({ where: { utmMedium: { not: null } }, select: { utmMedium: true }, distinct: ['utmMedium'] }),
      prisma.registration.findMany({ where: { utmCampaign: { not: null } }, select: { utmCampaign: true }, distinct: ['utmCampaign'] }),
    ]);

    return {
      funnels: funnels.map((f) => f.funnel).filter(Boolean),
      utmSources: utmSources.map((s) => s.utmSource).filter(Boolean),
      utmMediums: utmMediums.map((m) => m.utmMedium).filter(Boolean),
      utmCampaigns: utmCampaigns.map((c) => c.utmCampaign).filter(Boolean),
    };
  },

  // ── Settings ──
  async getSettings() {
    const settings = await prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) result[s.key] = s.value;
    if (!result['attribution_window_hours']) result['attribution_window_hours'] = '72';
    return result;
  },

  async updateSetting(key: string, value: string) {
    return prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  },
};

// ── Extended analytics functions ──

/**
 * Dead leads: contacts who registered but never attended in last N days.
 */
export async function getDeadLeads(opts: {
  daysSince?: number;
  funnel?: string;
  utmSource?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const days = opts.daysSince ?? 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const regWhere: any = {
    registeredAt: { lte: cutoff },
  };
  if (opts.funnel) regWhere.funnel = opts.funnel;
  if (opts.utmSource) regWhere.utmSource = opts.utmSource;
  if (opts.dateFrom) regWhere.registeredAt = { ...regWhere.registeredAt, gte: new Date(opts.dateFrom) };
  if (opts.dateTo) regWhere.registeredAt = { ...regWhere.registeredAt, lte: new Date(opts.dateTo) };

  // Get all contacts who registered
  const registrations = await prisma.registration.findMany({
    where: regWhere,
    include: { contact: true, webinar: true },
    distinct: ['contactId'],
    orderBy: { registeredAt: 'desc' },
  });

  // Filter out those who attended any webinar
  const contactIds = registrations.map((r) => r.contactId);

  const attendedContactIds = await prisma.attendance.findMany({
    where: { contactId: { in: contactIds } },
    select: { contactId: true },
    distinct: ['contactId'],
  });

  const attendedSet = new Set(attendedContactIds.map((a) => a.contactId));

  const deadLeads = registrations.filter((r) => !attendedSet.has(r.contactId));

  return deadLeads.map((r) => ({
    contactId: r.contactId,
    name: r.contact.name,
    email: r.contact.email,
    phone: r.contact.phone,
    funnel: r.funnel,
    utmSource: r.utmSource,
    webinarDate: r.webinar.scheduledAt.toISOString(),
    registeredAt: r.registeredAt.toISOString(),
    daysSinceRegistration: Math.floor(
      (Date.now() - r.registeredAt.getTime()) / (1000 * 60 * 60 * 24),
    ),
  }));
}

/**
 * Time-to-action analytics: avg time between funnel stages.
 */
export async function getTimeToAction(filter: AnalyticsFilter) {
  const webinarWhere = buildWebinarWhere(filter);

  const webinars = await prisma.webinar.findMany({ where: webinarWhere, select: { id: true } });
  const webinarIds = webinars.map((w) => w.id);

  // For each contact: find registration → attendance → order → payment timings
  const contacts = await prisma.contact.findMany({
    where: {
      registrations: { some: { webinarId: { in: webinarIds } } },
    },
    include: {
      registrations: {
        where: { webinarId: { in: webinarIds } },
        orderBy: { registeredAt: 'asc' },
        take: 1,
      },
      attendances: {
        where: { webinarId: { in: webinarIds } },
        orderBy: { attendedAt: 'asc' },
        take: 1,
      },
      orders: {
        where: { attributedWebinarId: { in: webinarIds } },
        orderBy: { orderedAt: 'asc' },
        take: 1,
      },
    },
  });

  const regToAttDelays: number[] = [];
  const attToOrderDelays: number[] = [];
  const orderToPayDelays: number[] = [];

  for (const contact of contacts) {
    const reg = contact.registrations[0];
    const att = contact.attendances[0];
    const order = contact.orders[0];

    if (reg && att) {
      const hours = (att.attendedAt.getTime() - reg.registeredAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0 && hours < 720) regToAttDelays.push(hours); // max 30 days
    }

    if (att && order) {
      const hours = (order.orderedAt.getTime() - att.attendedAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0 && hours < 720) attToOrderDelays.push(hours);
    }

    if (order?.paidAt) {
      const hours = (order.paidAt.getTime() - order.orderedAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0 && hours < 720) orderToPayDelays.push(hours);
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;

  return {
    registrationToAttendance: {
      avgHours: avg(regToAttDelays),
      sampleSize: regToAttDelays.length,
    },
    attendanceToOrder: {
      avgHours: avg(attToOrderDelays),
      sampleSize: attToOrderDelays.length,
    },
    orderToPayment: {
      avgHours: avg(orderToPayDelays),
      sampleSize: orderToPayDelays.length,
    },
  };
}
