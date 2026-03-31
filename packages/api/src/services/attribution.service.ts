import { prisma } from '../lib/prisma';
import type { Contact } from '@prisma/client';

const DEFAULT_ATTRIBUTION_WINDOW_HOURS = 72;

export interface AttributionResult {
  type: 'DIRECT' | 'DEFERRED' | 'UNATTRIBUTED';
  webinarId: string | null;
  attendanceId: string | null;
}

export const attributionService = {
  /**
   * Core attribution algorithm.
   *
   * 1. Find the latest attendance for this contact
   * 2. Read attribution window from settings (default 72h)
   * 3. Compare: orderedAt - lastAttendance.attendedAt
   * 4. If diff ≤ window → DIRECT (link to webinar)
   * 5. If diff > window → DEFERRED (no webinar link)
   * 6. If no attendance → UNATTRIBUTED
   */
  async attribute(contact: Contact, orderedAt: Date): Promise<AttributionResult> {
    // Find last attendance
    const lastAttendance = await prisma.attendance.findFirst({
      where: { contactId: contact.id },
      orderBy: { attendedAt: 'desc' },
    });

    if (!lastAttendance) {
      return { type: 'UNATTRIBUTED', webinarId: null, attendanceId: null };
    }

    // Read attribution window from settings
    const windowHours = await this.getAttributionWindowHours();

    // Calculate difference in hours
    const diffMs = orderedAt.getTime() - lastAttendance.attendedAt.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= windowHours) {
      return {
        type: 'DIRECT',
        webinarId: lastAttendance.webinarId,
        attendanceId: lastAttendance.id,
      };
    }

    return {
      type: 'DEFERRED',
      webinarId: null,
      attendanceId: lastAttendance.id,
    };
  },

  async getAttributionWindowHours(): Promise<number> {
    const setting = await prisma.setting.findUnique({
      where: { key: 'attribution_window_hours' },
    });

    if (setting) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_ATTRIBUTION_WINDOW_HOURS;
  },
};
