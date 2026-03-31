import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { webinarService } from '../../services/webinar.service';

const prisma = new PrismaClient();

describe('webinar.service', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates webinar for a given date', async () => {
    const webinar = await webinarService.findOrCreateByDate('2026-03-10T20:00:00+03:00');

    // Should be normalized to 20:00 MSK = 17:00 UTC
    const scheduled = new Date(webinar.scheduledAt);
    expect(scheduled.getUTCHours()).toBe(17);
    expect(scheduled.getUTCDate()).toBe(10);
  });

  it('creates webinar for Thursday date', async () => {
    const webinar = await webinarService.findOrCreateByDate('2026-03-12T20:00:00+03:00');

    const scheduled = new Date(webinar.scheduledAt);
    expect(scheduled.getUTCHours()).toBe(17);
    expect(scheduled.getUTCDate()).toBe(12);
  });

  it('auto-creates webinar if it does not exist', async () => {
    const countBefore = await prisma.webinar.count();

    await webinarService.findOrCreateByDate('2026-03-17T20:00:00+03:00');

    const countAfter = await prisma.webinar.count();
    expect(countAfter).toBe(countBefore + 1);
  });

  it('returns existing webinar instead of creating duplicate', async () => {
    const countBefore = await prisma.webinar.count();

    // Two calls for the same webinar date
    await webinarService.findOrCreateByDate('2026-03-24T20:00:00+03:00');
    await webinarService.findOrCreateByDate('2026-03-24T20:00:00+03:00');

    const countAfter = await prisma.webinar.count();
    // Only one new webinar should have been created
    expect(countAfter).toBe(countBefore + 1);
  });

  it('finds webinar by attendance date', async () => {
    // First create a webinar for Mar 10
    const created = await webinarService.findOrCreateByDate('2026-04-01T20:00:00+03:00');

    // Then find by attendance on the same day
    const found = await webinarService.findByAttendanceDate('2026-04-01T20:05:00+03:00');

    expect(found.id).toBe(created.id);
  });
});
