/**
 * Date utilities for webinar scheduling.
 * All dates are stored in UTC. Conversion to MSK (UTC+3) happens here.
 */

const MSK_OFFSET_HOURS = 3;

/** Convert a Date to MSK by adding 3 hours */
export function toMSK(date: Date): Date {
  return new Date(date.getTime() + MSK_OFFSET_HOURS * 60 * 60 * 1000);
}

/** Convert a MSK Date back to UTC by subtracting 3 hours */
export function fromMSK(mskDate: Date): Date {
  return new Date(mskDate.getTime() - MSK_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Determine which webinar a registration belongs to based on registration windows.
 *
 * Schedule: Tue and Thu at 20:00 MSK
 * Registration windows:
 *   - Tuesday webinar: Thu 20:00 MSK → Tue 20:00 MSK
 *   - Thursday webinar: Tue 20:00 MSK → Thu 20:00 MSK
 *
 * Returns the scheduled date of the target webinar (in UTC, representing 20:00 MSK = 17:00 UTC).
 */
export function getWebinarByRegWindow(registeredAt: Date): {
  scheduledAt: Date;
  regWindowStart: Date;
  regWindowEnd: Date;
  dayOfWeek: 'TUESDAY' | 'THURSDAY';
} {
  const msk = toMSK(registeredAt);
  const mskDay = msk.getUTCDay(); // 0=Sun..6=Sat
  const mskHour = msk.getUTCHours();

  // Find the next webinar day (Tue=2 or Thu=4) at 20:00 MSK
  // The current datetime is within the reg window of the NEXT webinar
  let targetDay: number;
  let targetDayOfWeek: 'TUESDAY' | 'THURSDAY';

  // Determine which window we're in
  // After Tue 20:00 MSK and before Thu 20:00 MSK → Thursday webinar
  // After Thu 20:00 MSK and before Tue 20:00 MSK → Tuesday webinar

  const isAfterTime = (day: number, hour: number): boolean => {
    if (mskDay > day) return true;
    if (mskDay === day && mskHour >= hour) return true;
    return false;
  };

  const isBeforeOrAtTime = (day: number, hour: number): boolean => {
    if (mskDay < day) return true;
    if (mskDay === day && mskHour < hour) return true;
    return false;
  };

  // Check if we're in the Tuesday→Thursday window (Thu webinar)
  // i.e., after Tue 20:00 AND before Thu 20:00
  const afterTue2000 = isAfterTime(2, 20);
  const beforeThu2000 = isBeforeOrAtTime(4, 20);

  if (afterTue2000 && beforeThu2000) {
    // Thursday webinar window
    targetDay = 4; // Thursday
    targetDayOfWeek = 'THURSDAY';
  } else {
    // Tuesday webinar window
    targetDay = 2; // Tuesday
    targetDayOfWeek = 'TUESDAY';
  }

  // Calculate the target webinar date
  const mskDate = new Date(Date.UTC(
    msk.getUTCFullYear(),
    msk.getUTCMonth(),
    msk.getUTCDate(),
    20, 0, 0, 0
  ));

  let daysUntilTarget = targetDay - mskDay;
  if (daysUntilTarget < 0) {
    daysUntilTarget += 7;
  }
  // If it's the target day but before 20:00, daysUntilTarget is 0 (same day)
  // If it's the target day and after/at 20:00, we need next week's target
  if (daysUntilTarget === 0 && mskHour >= 20) {
    daysUntilTarget = 7;
  }

  const scheduledMSK = new Date(mskDate.getTime() + daysUntilTarget * 24 * 60 * 60 * 1000);
  const scheduledAt = fromMSK(scheduledMSK); // Convert to UTC (17:00 UTC)

  // Calculate registration window
  // The reg window starts at 20:00 MSK of the PREVIOUS webinar day
  // Tuesday window: previous Thursday 20:00 → Tuesday 20:00
  // Thursday window: previous Tuesday 20:00 → Thursday 20:00
  const prevWebinarDaysBack = targetDayOfWeek === 'TUESDAY' ? 5 : 2; // Tue-Thu=2 days, Thu-Tue=5 days
  const regWindowEndMSK = new Date(scheduledMSK.getTime());
  const regWindowStartMSK = new Date(scheduledMSK.getTime() - prevWebinarDaysBack * 24 * 60 * 60 * 1000);

  return {
    scheduledAt,
    regWindowStart: fromMSK(regWindowStartMSK),
    regWindowEnd: fromMSK(regWindowEndMSK),
    dayOfWeek: targetDayOfWeek,
  };
}

/**
 * Find the closest webinar by date (for attendance matching).
 * Returns the webinar scheduled on the same day (Tue or Thu at 20:00 MSK).
 */
export function getWebinarByDate(attendedAt: Date): {
  scheduledAt: Date;
  regWindowStart: Date;
  regWindowEnd: Date;
  dayOfWeek: 'TUESDAY' | 'THURSDAY';
} {
  const msk = toMSK(attendedAt);
  const mskDay = msk.getUTCDay();

  // Find the closest Tue (2) or Thu (4)
  let targetDay: number;
  let targetDayOfWeek: 'TUESDAY' | 'THURSDAY';

  // If it's Tue or Thu, use that day
  if (mskDay === 2) {
    targetDay = 2;
    targetDayOfWeek = 'TUESDAY';
  } else if (mskDay === 4) {
    targetDay = 4;
    targetDayOfWeek = 'THURSDAY';
  } else {
    // Find nearest Tue or Thu
    const distToTue = Math.min(Math.abs(mskDay - 2), 7 - Math.abs(mskDay - 2));
    const distToThu = Math.min(Math.abs(mskDay - 4), 7 - Math.abs(mskDay - 4));

    if (distToTue <= distToThu) {
      // Find the closest Tuesday
      let diff = 2 - mskDay;
      if (diff > 3) diff -= 7;
      if (diff < -3) diff += 7;
      targetDay = 2;
      targetDayOfWeek = 'TUESDAY';
    } else {
      let diff = 4 - mskDay;
      if (diff > 3) diff -= 7;
      if (diff < -3) diff += 7;
      targetDay = 4;
      targetDayOfWeek = 'THURSDAY';
    }
  }

  // Build the scheduled date at 20:00 MSK on the target day
  const mskDate = new Date(Date.UTC(
    msk.getUTCFullYear(),
    msk.getUTCMonth(),
    msk.getUTCDate(),
    20, 0, 0, 0
  ));

  let daysDiff = targetDay - mskDay;
  // For attendance, we pick the same-day or nearest past/future webinar
  // Typically attendance happens on the webinar day itself
  if (daysDiff > 3) daysDiff -= 7;
  if (daysDiff < -3) daysDiff += 7;

  const scheduledMSK = new Date(mskDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
  const scheduledAt = fromMSK(scheduledMSK);

  // Calculate reg window
  const prevWebinarDaysBack = targetDayOfWeek === 'TUESDAY' ? 5 : 2;
  const regWindowEndMSK = new Date(scheduledMSK.getTime());
  const regWindowStartMSK = new Date(scheduledMSK.getTime() - prevWebinarDaysBack * 24 * 60 * 60 * 1000);

  return {
    scheduledAt,
    regWindowStart: fromMSK(regWindowStartMSK),
    regWindowEnd: fromMSK(regWindowEndMSK),
    dayOfWeek: targetDayOfWeek,
  };
}
