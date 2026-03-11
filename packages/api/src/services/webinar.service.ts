import { prisma } from '../lib/prisma';
import { getWebinarByRegWindow, getWebinarByDate } from '../lib/date-utils';
import type { Webinar } from '@prisma/client';
import type { DayOfWeek } from '@prisma/client';

export const webinarService = {
  /**
   * Find webinar by registration window. Auto-creates if not found.
   */
  async findByRegWindow(registeredAtISO: string): Promise<Webinar> {
    const registeredAt = new Date(registeredAtISO);
    const info = getWebinarByRegWindow(registeredAt);

    // Try to find existing webinar at this scheduled time
    const existing = await prisma.webinar.findFirst({
      where: { scheduledAt: info.scheduledAt },
    });

    if (existing) {
      return existing;
    }

    // Auto-create webinar
    return prisma.webinar.create({
      data: {
        scheduledAt: info.scheduledAt,
        regWindowStart: info.regWindowStart,
        regWindowEnd: info.regWindowEnd,
        dayOfWeek: info.dayOfWeek as DayOfWeek,
        status: 'UPCOMING',
      },
    });
  },

  /**
   * Find webinar by attendance date. Auto-creates if not found.
   * Finds the closest webinar on the same day (Tue or Thu).
   */
  async findByDate(attendedAtISO: string): Promise<Webinar> {
    const attendedAt = new Date(attendedAtISO);
    const info = getWebinarByDate(attendedAt);

    // Try to find existing webinar at this scheduled time
    const existing = await prisma.webinar.findFirst({
      where: { scheduledAt: info.scheduledAt },
    });

    if (existing) {
      return existing;
    }

    // Auto-create webinar
    return prisma.webinar.create({
      data: {
        scheduledAt: info.scheduledAt,
        regWindowStart: info.regWindowStart,
        regWindowEnd: info.regWindowEnd,
        dayOfWeek: info.dayOfWeek as DayOfWeek,
        status: 'UPCOMING',
      },
    });
  },
};
