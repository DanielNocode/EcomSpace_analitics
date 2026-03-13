import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { webinarService } from '../../services/webinar.service';

const prisma = new PrismaClient();

describe('webinar.service', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('determines Tuesday webinar for registration in Tue window', async () => {
    // Monday March 9, 2026 at 15:00 MSK (12:00 UTC)
    // Falls in: Thu 20:00 → Tue 20:00 window → Tuesday Mar 10 webinar
    const webinar = await webinarService.findByRegWindow('2026-03-09T12:00:00Z');

    expect(webinar.dayOfWeek).toBe('TUESDAY');
    // Scheduled at Tue Mar 10, 20:00 MSK = 17:00 UTC
    const scheduled = new Date(webinar.scheduledAt);
    expect(scheduled.getUTCDay()).toBe(2); // Tuesday
    expect(scheduled.getUTCHours()).toBe(17); // 20:00 MSK = 17:00 UTC
  });

  it('determines Thursday webinar for registration in Thu window', async () => {
    // Wednesday March 11, 2026 at 15:00 MSK (12:00 UTC)
    // Falls in: Tue 20:00 → Thu 20:00 window → Thursday Mar 12 webinar
    const webinar = await webinarService.findByRegWindow('2026-03-11T12:00:00Z');

    expect(webinar.dayOfWeek).toBe('THURSDAY');
    const scheduled = new Date(webinar.scheduledAt);
    expect(scheduled.getUTCDay()).toBe(4); // Thursday
  });

  it('auto-creates webinar if it does not exist', async () => {
    const countBefore = await prisma.webinar.count();

    // Use a unique date that hasn't been used in prior tests
    await webinarService.findByRegWindow('2026-03-16T12:00:00Z');

    const countAfter = await prisma.webinar.count();
    expect(countAfter).toBe(countBefore + 1);
  });

  it('returns existing webinar instead of creating duplicate', async () => {
    const countBefore = await prisma.webinar.count();

    // Two registrations for the same webinar window
    await webinarService.findByRegWindow('2026-03-23T12:00:00Z');
    await webinarService.findByRegWindow('2026-03-23T14:00:00Z');

    const countAfter = await prisma.webinar.count();
    // Only one new webinar should have been created
    expect(countAfter).toBe(countBefore + 1);
  });
});
