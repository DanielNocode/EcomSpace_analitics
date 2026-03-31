import { prisma } from '../lib/prisma';
import { normalizeWebinarDate } from '../lib/date-utils';
import type { Webinar } from '@prisma/client';

export const webinarService = {
  /**
   * Find or create webinar by explicit date from payload.
   * The date is normalized to 20:00 MSK (17:00 UTC) of that day.
   */
  async findOrCreateByDate(webinarDateISO: string): Promise<Webinar> {
    const scheduledAt = normalizeWebinarDate(webinarDateISO);

    // Try to find existing webinar at this scheduled time
    const existing = await prisma.webinar.findUnique({
      where: { scheduledAt },
    });

    if (existing) {
      return existing;
    }

    // Auto-create webinar
    return prisma.webinar.create({
      data: {
        scheduledAt,
        status: 'UPCOMING',
      },
    });
  },

  /**
   * Find webinar closest to the given attendance date.
   * Looks for the webinar scheduled on the same day.
   */
  async findByAttendanceDate(attendedAtISO: string): Promise<Webinar> {
    const attendedAt = new Date(attendedAtISO);

    // Find the closest webinar by scheduled date
    const closest = await prisma.webinar.findFirst({
      orderBy: {
        scheduledAt: 'desc',
      },
      where: {
        scheduledAt: {
          lte: new Date(attendedAt.getTime() + 24 * 60 * 60 * 1000), // +1 day buffer
        },
      },
    });

    if (closest) {
      return closest;
    }

    // Fallback: create a webinar for this date
    const scheduledAt = normalizeWebinarDate(attendedAtISO);
    return prisma.webinar.create({
      data: {
        scheduledAt,
        status: 'UPCOMING',
      },
    });
  },

  /**
   * Get all webinars with optional date range filter.
   */
  async list(dateFrom?: Date, dateTo?: Date): Promise<Webinar[]> {
    const where: any = {};

    if (dateFrom || dateTo) {
      where.scheduledAt = {};
      if (dateFrom) where.scheduledAt.gte = dateFrom;
      if (dateTo) where.scheduledAt.lte = dateTo;
    }

    return prisma.webinar.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
    });
  },

  /**
   * Get a webinar by ID.
   */
  async getById(id: string): Promise<Webinar | null> {
    return prisma.webinar.findUnique({ where: { id } });
  },
};
