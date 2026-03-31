import { prisma } from '../lib/prisma';

export interface BizonViewerRow {
  date?: string;
  name?: string;
  email?: string;
  phone?: string;
  ip?: string;
  joinedAt?: string;
  leftAt?: string;
  intervalStart?: Date;
  intervalEnd?: Date;
  device?: string;
  ticket?: string;
  banned?: string;
  partner?: string;
  clickedBanner?: string;
  clickedButton?: string;
  openedOrder?: string;
  madeOrder?: string;
  products?: string;
  city?: string;
  region?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  entryUrl?: string;
  referrer?: string;
  bizonViewerId?: string;
  intervals?: Array<{ start: Date; end: Date }>;
}

export interface BizonSummary {
  roomId: string;
  roomTitle?: string;
  startedAt: Date;
  durationMinutes: number;
  peakViewers: number;
  totalViewers: number;
  partnerViewers: number;
  totalOrders: number;
  totalRevenue: number;
  buttonClicks: number;
  bannerClicks: number;
  orderPageViews: number;
  buttonClickRate: number;
  bannerClickRate: number;
  commentsCount: number;
}

export interface ParsedBizonReport {
  summary: BizonSummary;
  viewers: BizonViewerRow[];
  chatMessages: Array<{ time: string; senderId?: string; senderName?: string; message: string }>;
}

/**
 * Parse Bizon365 XLSX report using xlsx library.
 * The XLSX has 4 sheets: Сведения, Зрители, Уникальные зрители, Чат
 */
export async function parseBizonXlsx(buffer: Buffer): Promise<ParsedBizonReport> {
  // Dynamic import to avoid issues if xlsx not installed
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const summary = parseSummarySheet(workbook);
  const viewers = parseViewersSheet(workbook);
  const chatMessages = parseChatSheet(workbook);

  return { summary, viewers, chatMessages };
}

function parseSummarySheet(workbook: any): BizonSummary {
  const sheet = workbook.Sheets['Сведения'];
  if (!sheet) throw new Error('Sheet "Сведения" not found in report');

  const rows: any[][] = workbook.utils
    ? workbook.utils.sheet_to_json(sheet, { header: 1, raw: false })
    : require('xlsx').utils.sheet_to_json(sheet, { header: 1, raw: false });

  // Parse room info from row 0: ['Комната', '126062:web-3secret']
  const roomLine = rows[0] ?? [];
  const roomId = String(roomLine[1] ?? '').trim();
  const roomTitle = rows[1]?.[0] ? String(rows[1][0]).trim() : undefined;

  // Parse start time from row 3: ['Начало:', '30.03.2026 19:39']
  let startedAt = new Date();
  const startLine = rows.find((r) => r[0] && String(r[0]).includes('Начало:'));
  if (startLine) {
    const dateStr = String(startLine[1] ?? '').trim();
    // Format: 30.03.2026 19:39
    const [datePart, timePart] = dateStr.split(' ');
    if (datePart && timePart) {
      const [day, month, year] = datePart.split('.');
      startedAt = new Date(`${year}-${month}-${day}T${timePart}:00`);
    }
  }

  // Parse duration from row 4: ['Длительность, минут:', '161']
  let durationMinutes = 0;
  const durationLine = rows.find((r) => r[0] && String(r[0]).includes('Длительность'));
  if (durationLine) durationMinutes = parseInt(String(durationLine[1] ?? '0'), 10) || 0;

  // Peak viewers: 'Единовременный максимум зрителей:'
  let peakViewers = 0;
  const peakLine = rows.find((r) => r[0] && String(r[0]).includes('максимум'));
  if (peakLine) peakViewers = parseInt(String(peakLine[1] ?? '0'), 10) || 0;

  // Total viewers: 'Всего заходило зрителей:'
  let totalViewers = 0;
  const totalLine = rows.find((r) => r[0] && String(r[0]).includes('заходило'));
  if (totalLine) totalViewers = parseInt(String(totalLine[1] ?? '0'), 10) || 0;

  // Partner viewers: 'Зрителей от партнеров:'
  let partnerViewers = 0;
  const partnerLine = rows.find((r) => r[0] && String(r[0]).includes('партнер'));
  if (partnerLine) partnerViewers = parseInt(String(partnerLine[1] ?? '0'), 10) || 0;

  // Orders line: 'Всего заказов: '
  let totalOrders = 0;
  const ordersLine = rows.find((r) => r[0] && String(r[0]).includes('заказов'));
  if (ordersLine) {
    const v = String(ordersLine[1] ?? '').replace('—', '0').trim();
    totalOrders = parseInt(v, 10) || 0;
  }

  // Revenue: 'Прибыль: '
  let totalRevenue = 0;
  const revLine = rows.find((r) => r[0] && String(r[0]).includes('Прибыль'));
  if (revLine) {
    const v = String(revLine[1] ?? '').replace('руб', '').replace('0 ', '0').trim();
    totalRevenue = parseFloat(v) || 0;
  }

  // Conversions: 'Нажали на кнопку', 'Нажали на баннер'
  let buttonClicks = 0, buttonClickRate = 0, bannerClicks = 0, bannerClickRate = 0, orderPageViews = 0;
  for (const row of rows) {
    const label = String(row[0] ?? '');
    if (label.includes('кнопку')) {
      buttonClickRate = parseFloat(String(row[1] ?? '0').replace('%', '')) || 0;
      buttonClicks = parseInt(String(row[2] ?? '0'), 10) || 0;
    }
    if (label.includes('баннер')) {
      bannerClickRate = parseFloat(String(row[1] ?? '0').replace('%', '')) || 0;
      bannerClicks = parseInt(String(row[2] ?? '0'), 10) || 0;
    }
    if (label.includes('заказа')) {
      orderPageViews = parseInt(String(row[2] ?? '0'), 10) || 0;
    }
  }

  return {
    roomId,
    roomTitle,
    startedAt,
    durationMinutes,
    peakViewers,
    totalViewers,
    partnerViewers,
    totalOrders,
    totalRevenue,
    buttonClicks,
    bannerClicks,
    orderPageViews,
    buttonClickRate,
    bannerClickRate,
    commentsCount: 0, // will be filled from chat sheet
  };
}

function parseViewersSheet(workbook: any): BizonViewerRow[] {
  const XLSX = require('xlsx');
  const sheet = workbook.Sheets['Зрители'];
  if (!sheet) return [];

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, cellDates: true });

  // Row 0 is title (webinar name), Row 1 is headers
  // Data rows start at row 2, but viewer data can span multiple rows (intervals)
  const headers = rawRows[1] as string[];

  const colIndex = (name: string) => headers.findIndex((h) => h && h.includes(name));

  const COL = {
    date: colIndex('Дата'),
    name: colIndex('Имя зрителя'),
    email: colIndex('E-mail'),
    phone: colIndex('Телефон'),
    ip: colIndex('IP'),
    joinedAt: colIndex('На вебинаре с'),
    leftAt: colIndex('Досмотрел до'),
    intervalStart: colIndex('Интервалы'),
    intervalEnd: colIndex('присутствия'),
    device: colIndex('Устройство'),
    banner: colIndex('Клик по баннеру'),
    button: colIndex('Клик по кнопке'),
    orderForm: colIndex('Форма заказа'),
    order: colIndex('Заказ'),
    city: colIndex('Город'),
    region: colIndex('Регион'),
    utmSource: colIndex('utm_source'),
    utmMedium: colIndex('utm_medium'),
    utmCampaign: colIndex('utm_campaign'),
    utmTerm: colIndex('utm_term'),
    utmContent: colIndex('utm_content'),
    entryUrl: colIndex('Ссылка входа'),
    referrer: colIndex('Переход с'),
    viewerId: colIndex('id зрителя'),
    banned: colIndex('Бан'),
  };

  const viewers: BizonViewerRow[] = [];
  let currentViewer: BizonViewerRow | null = null;
  let currentBaseDate = ''; // e.g. "30.03.2026 19:39"

  for (let i = 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const hasViewerData = row[COL.date] || row[COL.name] || row[COL.email];

    if (hasViewerData) {
      // Save previous viewer
      if (currentViewer) viewers.push(currentViewer);

      // Track the base date for interval time parsing
      if (row[COL.date]) currentBaseDate = String(row[COL.date]);

      // New viewer row
      currentViewer = {
        date: row[COL.date] ? String(row[COL.date]) : undefined,
        name: row[COL.name] ? String(row[COL.name]) : undefined,
        email: row[COL.email] ? String(row[COL.email]) : undefined,
        phone: row[COL.phone] ? String(row[COL.phone]) : undefined,
        ip: row[COL.ip] ? String(row[COL.ip]) : undefined,
        joinedAt: row[COL.joinedAt] ? String(row[COL.joinedAt]) : undefined,
        leftAt: row[COL.leftAt] ? String(row[COL.leftAt]) : undefined,
        device: row[COL.device] ? String(row[COL.device]) : undefined,
        clickedBanner: row[COL.banner] ? String(row[COL.banner]) : undefined,
        clickedButton: row[COL.button] ? String(row[COL.button]) : undefined,
        openedOrder: row[COL.orderForm] ? String(row[COL.orderForm]) : undefined,
        madeOrder: row[COL.order] && row[COL.order] !== '−' ? String(row[COL.order]) : undefined,
        city: row[COL.city] ? String(row[COL.city]) : undefined,
        region: row[COL.region] ? String(row[COL.region]) : undefined,
        utmSource: row[COL.utmSource] ? String(row[COL.utmSource]) : undefined,
        utmMedium: row[COL.utmMedium] ? String(row[COL.utmMedium]) : undefined,
        utmCampaign: row[COL.utmCampaign] ? String(row[COL.utmCampaign]) : undefined,
        utmTerm: row[COL.utmTerm] ? String(row[COL.utmTerm]) : undefined,
        utmContent: row[COL.utmContent] ? String(row[COL.utmContent]) : undefined,
        entryUrl: row[COL.entryUrl] ? String(row[COL.entryUrl]) : undefined,
        referrer: row[COL.referrer] ? String(row[COL.referrer]) : undefined,
        bizonViewerId: row[COL.viewerId] ? String(row[COL.viewerId]) : undefined,
        banned: row[COL.banned] ? String(row[COL.banned]) : undefined,
        intervals: [],
      };

      // Add first interval if present
      if (row[COL.intervalStart] && row[COL.intervalEnd]) {
        const s = parseTimeWithBase(String(row[COL.intervalStart]), currentBaseDate)
                  || parseExcelDate(row[COL.intervalStart]);
        const e = parseTimeWithBase(String(row[COL.intervalEnd]), currentBaseDate)
                  || parseExcelDate(row[COL.intervalEnd]);
        if (s && e) currentViewer.intervals = [{ start: s, end: e }];
      }
    } else if (currentViewer) {
      // This row is an interval continuation for the current viewer
      if (row[COL.intervalStart] && row[COL.intervalEnd]) {
        const s = parseTimeWithBase(String(row[COL.intervalStart]), currentBaseDate)
                  || parseExcelDate(row[COL.intervalStart]);
        const e = parseTimeWithBase(String(row[COL.intervalEnd]), currentBaseDate)
                  || parseExcelDate(row[COL.intervalEnd]);
        if (s && e) {
          if (!currentViewer.intervals) currentViewer.intervals = [];
          currentViewer.intervals.push({ start: s, end: e });
        }
      }
    }
  }

  if (currentViewer) viewers.push(currentViewer);

  return viewers;
}

function parseChatSheet(
  workbook: any,
): Array<{ time: string; senderId?: string; senderName?: string; message: string }> {
  const XLSX = require('xlsx');
  const sheet = workbook.Sheets['Чат'];
  if (!sheet) return [];

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  const messages = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    messages.push({
      time: String(row[0] ?? ''),
      senderId: row[1] ? String(row[1]) : undefined,
      senderName: row[2] ? String(row[2]) : undefined,
      message: String(row[4] ?? row[3] ?? ''),
    });
  }

  return messages;
}

function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Try parsing string date
  try {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Parse a time-only string (HH:MM:SS) combined with a base date string (DD.MM.YYYY HH:MM).
 * Returns a full Date object. Handles day rollover (e.g. interval at 00:05 when webinar started at 23:30).
 */
function parseTimeWithBase(timeStr: string, baseDateStr: string): Date | null {
  if (!timeStr || !baseDateStr) return null;
  const timeMatch = String(timeStr).match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!timeMatch) return null;

  // Parse base date: "30.03.2026 19:39"
  const dateMatch = baseDateStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!dateMatch) return null;

  const [, day, month, year, baseHour] = dateMatch;
  const [, hours, minutes, seconds] = timeMatch;

  const d = new Date(`${year}-${month}-${day}T${hours.padStart(2, '0')}:${minutes}:${seconds}`);
  if (isNaN(d.getTime())) return null;

  // Handle day rollover: if interval time < base hour, it's the next day
  if (parseInt(hours) < parseInt(baseHour) - 12) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

/**
 * Calculate duration and watch percentage for a viewer.
 */
function calcViewerStats(
  viewer: BizonViewerRow,
  totalDuration: number,
): { durationMin: number; watchPercent: number } {
  if (!viewer.intervals || viewer.intervals.length === 0) {
    return { durationMin: 0, watchPercent: 0 };
  }

  let totalMs = 0;
  for (const interval of viewer.intervals) {
    totalMs += interval.end.getTime() - interval.start.getTime();
  }

  const durationMin = Math.round(totalMs / 60000);
  const watchPercent =
    totalDuration > 0 ? Math.min(100, Math.round((durationMin / totalDuration) * 10000) / 100) : 0;

  return { durationMin, watchPercent };
}

/**
 * Store a parsed Bizon report in the database.
 */
export async function storeBizonReport(
  parsed: ParsedBizonReport,
  fileName?: string,
): Promise<string> {
  const { summary, viewers, chatMessages } = parsed;

  // Try to find matching webinar by date
  const startDate = new Date(summary.startedAt);
  const dateStart = new Date(startDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(startDate);
  dateEnd.setHours(23, 59, 59, 999);

  const matchingWebinar = await prisma.webinar.findFirst({
    where: {
      scheduledAt: { gte: dateStart, lte: dateEnd },
    },
  });

  // Calculate avg watch percent
  const viewerStats = viewers.map((v) => calcViewerStats(v, summary.durationMinutes));
  const avgWatchPercent =
    viewerStats.length > 0
      ? viewerStats.reduce((sum, s) => sum + s.watchPercent, 0) / viewerStats.length
      : null;

  // Build viewer timeline (per minute)
  const timeline = buildViewerTimeline(viewers, summary.startedAt, summary.durationMinutes);

  // Create report record
  const report = await prisma.bizonReport.create({
    data: {
      webinarId: matchingWebinar?.id ?? null,
      roomId: summary.roomId,
      roomTitle: summary.roomTitle ?? null,
      startedAt: summary.startedAt,
      durationMinutes: summary.durationMinutes,
      peakViewers: summary.peakViewers,
      totalViewers: summary.totalViewers,
      partnerViewers: summary.partnerViewers,
      totalOrders: summary.totalOrders,
      totalRevenue: summary.totalRevenue,
      buttonClicks: summary.buttonClicks,
      bannerClicks: summary.bannerClicks,
      orderPageViews: summary.orderPageViews,
      buttonClickRate: summary.buttonClickRate,
      bannerClickRate: summary.bannerClickRate,
      commentsCount: chatMessages.length,
      avgWatchPercent,
      viewerTimeline: timeline as any,
      rawFileName: fileName ?? null,
    },
  });

  // Insert viewers
  if (viewers.length > 0) {
    const viewerData = viewers.map((v, idx) => {
      const stats = viewerStats[idx];
      return {
        reportId: report.id,
        bizonViewerId: v.bizonViewerId ?? null,
        name: v.name ?? null,
        email: v.email ?? null,
        phone: v.phone ?? null,
        ip: v.ip ?? null,
        joinedAt: v.joinedAt ?? null,
        leftAt: v.leftAt ?? null,
        durationMin: stats.durationMin,
        watchPercent: stats.watchPercent,
        device: v.device ?? null,
        city: v.city ?? null,
        region: v.region ?? null,
        utmSource: v.utmSource ?? null,
        utmMedium: v.utmMedium ?? null,
        utmCampaign: v.utmCampaign ?? null,
        utmContent: v.utmContent ?? null,
        utmTerm: v.utmTerm ?? null,
        clickedButton: !!v.clickedButton && v.clickedButton !== '' && v.clickedButton !== '0',
        clickedBanner: !!v.clickedBanner && v.clickedBanner !== '' && v.clickedBanner !== '0',
        openedOrder: !!v.openedOrder && v.openedOrder !== '' && v.openedOrder !== '0',
        madeOrder: !!v.madeOrder && v.madeOrder !== '' && v.madeOrder !== '−',
        isBanned: v.banned === '+' || v.banned === 'true',
        entryUrl: v.entryUrl ?? null,
        referrer: v.referrer ?? null,
        intervals: v.intervals
          ? (v.intervals.map((i) => ({
              start: i.start.toISOString(),
              end: i.end.toISOString(),
            })) as any)
          : null,
      };
    });

    await prisma.bizonReportViewer.createMany({ data: viewerData });
  }

  // Insert chat messages
  if (chatMessages.length > 0) {
    await prisma.bizonChatMessage.createMany({
      data: chatMessages.map((msg) => ({
        reportId: report.id,
        time: msg.time,
        senderId: msg.senderId ?? null,
        senderName: msg.senderName ?? null,
        message: msg.message,
      })),
    });
  }

  return report.id;
}

/**
 * Build a viewer timeline: array of {minute, viewers} for retention curve.
 */
function buildViewerTimeline(
  viewers: BizonViewerRow[],
  startedAt: Date,
  durationMinutes: number,
): Array<{ minute: number; viewers: number }> {
  if (durationMinutes === 0) return [];

  const buckets = new Array(durationMinutes + 1).fill(0);
  const startMs = startedAt.getTime();

  for (const viewer of viewers) {
    if (!viewer.intervals) continue;
    for (const interval of viewer.intervals) {
      const startMin = Math.max(0, Math.floor((interval.start.getTime() - startMs) / 60000));
      const endMin = Math.min(durationMinutes, Math.ceil((interval.end.getTime() - startMs) / 60000));
      for (let m = startMin; m <= endMin; m++) {
        if (m >= 0 && m < buckets.length) buckets[m]++;
      }
    }
  }

  return buckets.map((viewers, minute) => ({ minute, viewers }));
}

// ── Service object (used by analyticsService) ──

export const bizonReportService = {
  async listReports() {
    return prisma.bizonReport.findMany({
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
  },

  async getReport(reportId: string) {
    return getBizonAnalytics(reportId);
  },

  async getReportsByWebinar(webinarId: string) {
    return prisma.bizonReport.findMany({
      where: { webinarId },
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
      },
    });
  },

  async getRetentionCurve(reportId: string) {
    const report = await prisma.bizonReport.findUnique({
      where: { id: reportId },
      select: { viewerTimeline: true, durationMinutes: true },
    });
    if (!report) return null;
    return {
      reportId,
      durationMinutes: report.durationMinutes,
      curve: (report.viewerTimeline as Array<{ minute: number; viewers: number }>) ?? [],
    };
  },

  async getChatAnalytics(reportId: string) {
    const messages = await prisma.bizonChatMessage.findMany({
      where: { reportId },
      orderBy: { time: 'asc' },
    });
    return {
      reportId,
      total: messages.length,
      messages: messages.map((m) => ({
        time: m.time,
        senderName: m.senderName,
        message: m.message,
      })),
    };
  },
};

/**
 * Get Bizon report analytics for a webinar.
 */
export async function getBizonAnalytics(reportId: string) {
  const report = await prisma.bizonReport.findUnique({
    where: { id: reportId },
    include: {
      viewers: true,
      chatMessages: { orderBy: { time: 'asc' } },
    },
  });

  if (!report) return null;

  const viewers = report.viewers;
  const totalViewers = viewers.length;

  const avgWatchPercent =
    totalViewers > 0
      ? viewers.reduce((sum, v) => sum + (v.watchPercent ?? 0), 0) / totalViewers
      : 0;

  const retentionCurve = report.viewerTimeline as Array<{ minute: number; viewers: number }> | null;

  return {
    report: {
      id: report.id,
      webinarId: report.webinarId,
      roomId: report.roomId,
      roomTitle: report.roomTitle,
      startedAt: report.startedAt.toISOString(),
      durationMinutes: report.durationMinutes,
      peakViewers: report.peakViewers,
      totalViewers: report.totalViewers,
      commentsCount: report.commentsCount,
      avgWatchPercent: Math.round((report.avgWatchPercent ?? avgWatchPercent) * 100) / 100,
      buttonClicks: report.buttonClicks,
      bannerClicks: report.bannerClicks,
      orderPageViews: report.orderPageViews,
    },
    retentionCurve: retentionCurve ?? [],
    topViewers: viewers
      .sort((a, b) => (b.watchPercent ?? 0) - (a.watchPercent ?? 0))
      .slice(0, 20)
      .map((v) => ({
        name: v.name,
        email: v.email,
        durationMin: v.durationMin,
        watchPercent: v.watchPercent,
        madeOrder: v.madeOrder,
        clickedButton: v.clickedButton,
        utmSource: v.utmSource,
      })),
    chatCount: report.chatMessages.length,
  };
}
