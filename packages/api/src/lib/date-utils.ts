/**
 * Date utilities for EcomSpace Analytics.
 * All dates are stored in UTC. Conversion to MSK (UTC+3) for display.
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
 * Parse a webinar date from ISO string and normalize to the start of the day in UTC.
 * Used to match webinars by their scheduled date.
 */
export function normalizeWebinarDate(isoString: string): Date {
  const d = new Date(isoString);
  // Normalize to 20:00 MSK (17:00 UTC) on that day — стандартное время начала вебинара
  const msk = toMSK(d);
  const normalized = new Date(Date.UTC(
    msk.getUTCFullYear(),
    msk.getUTCMonth(),
    msk.getUTCDate(),
    20, 0, 0, 0,
  ));
  return fromMSK(normalized);
}

/**
 * Get day of week name from a date (in MSK timezone).
 */
export function getDayOfWeekMSK(date: Date): string {
  const msk = toMSK(date);
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[msk.getUTCDay()];
}

/**
 * Format a date for display in MSK timezone.
 */
export function formatMSK(date: Date): string {
  const msk = toMSK(date);
  const y = msk.getUTCFullYear();
  const m = String(msk.getUTCMonth() + 1).padStart(2, '0');
  const d = String(msk.getUTCDate()).padStart(2, '0');
  const h = String(msk.getUTCHours()).padStart(2, '0');
  const min = String(msk.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min} MSK`;
}
