import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { attributionService } from '../../services/attribution.service';

const prisma = new PrismaClient();

describe('attribution.service', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns DIRECT when attendance is within 72h', async () => {
    const contact = await prisma.contact.create({
      data: { gcUserId: 'attr-direct-user', email: 'direct@test.ru' },
    });

    const webinar = await prisma.webinar.create({
      data: {
        scheduledAt: new Date('2026-03-10T17:00:00Z'),
        regWindowStart: new Date('2026-03-05T17:00:00Z'),
        regWindowEnd: new Date('2026-03-10T17:00:00Z'),
        dayOfWeek: 'TUESDAY',
      },
    });

    await prisma.attendance.create({
      data: {
        contactId: contact.id,
        webinarId: webinar.id,
        gcDealId: 'attr-direct-att',
        attendedAt: new Date('2026-03-10T17:05:00Z'), // Tue 20:05 MSK
      },
    });

    // Order 2 hours after attendance (within 72h)
    const result = await attributionService.attribute(
      contact,
      new Date('2026-03-10T19:05:00Z'),
    );

    expect(result.type).toBe('DIRECT');
    expect(result.webinarId).toBe(webinar.id);
    expect(result.attendanceId).toBeTruthy();
  });

  it('returns DEFERRED when attendance is beyond 72h', async () => {
    const contact = await prisma.contact.create({
      data: { gcUserId: 'attr-deferred-user', email: 'deferred@test.ru' },
    });

    const webinar = await prisma.webinar.create({
      data: {
        scheduledAt: new Date('2026-03-03T17:00:00Z'),
        regWindowStart: new Date('2026-02-28T17:00:00Z'),
        regWindowEnd: new Date('2026-03-03T17:00:00Z'),
        dayOfWeek: 'TUESDAY',
      },
    });

    await prisma.attendance.create({
      data: {
        contactId: contact.id,
        webinarId: webinar.id,
        gcDealId: 'attr-deferred-att',
        attendedAt: new Date('2026-03-03T17:05:00Z'), // Tue Mar 3
      },
    });

    // Order 7 days after attendance (beyond 72h)
    const result = await attributionService.attribute(
      contact,
      new Date('2026-03-10T17:05:00Z'),
    );

    expect(result.type).toBe('DEFERRED');
    expect(result.webinarId).toBeNull();
    expect(result.attendanceId).toBeTruthy();
  });

  it('returns UNATTRIBUTED when no attendance exists', async () => {
    const contact = await prisma.contact.create({
      data: { gcUserId: 'attr-unattr-user', email: 'unattr@test.ru' },
    });

    const result = await attributionService.attribute(
      contact,
      new Date('2026-03-10T17:05:00Z'),
    );

    expect(result.type).toBe('UNATTRIBUTED');
    expect(result.webinarId).toBeNull();
    expect(result.attendanceId).toBeNull();
  });

  it('attributes to the LATEST attendance when multiple exist', async () => {
    const contact = await prisma.contact.create({
      data: { gcUserId: 'attr-multi-user', email: 'multi@test.ru' },
    });

    const webinar1 = await prisma.webinar.create({
      data: {
        scheduledAt: new Date('2026-03-03T17:00:00Z'),
        regWindowStart: new Date('2026-02-28T17:00:00Z'),
        regWindowEnd: new Date('2026-03-03T17:00:00Z'),
        dayOfWeek: 'TUESDAY',
      },
    });

    const webinar2 = await prisma.webinar.create({
      data: {
        scheduledAt: new Date('2026-03-05T17:00:00Z'),
        regWindowStart: new Date('2026-03-03T17:00:00Z'),
        regWindowEnd: new Date('2026-03-05T17:00:00Z'),
        dayOfWeek: 'THURSDAY',
      },
    });

    const webinar3 = await prisma.webinar.create({
      data: {
        scheduledAt: new Date('2026-03-10T17:00:00Z'),
        regWindowStart: new Date('2026-03-05T17:00:00Z'),
        regWindowEnd: new Date('2026-03-10T17:00:00Z'),
        dayOfWeek: 'TUESDAY',
      },
    });

    // 3 attendances
    await prisma.attendance.create({
      data: {
        contactId: contact.id,
        webinarId: webinar1.id,
        gcDealId: 'attr-multi-att-1',
        attendedAt: new Date('2026-03-03T17:05:00Z'),
      },
    });

    await prisma.attendance.create({
      data: {
        contactId: contact.id,
        webinarId: webinar2.id,
        gcDealId: 'attr-multi-att-2',
        attendedAt: new Date('2026-03-05T17:05:00Z'),
      },
    });

    await prisma.attendance.create({
      data: {
        contactId: contact.id,
        webinarId: webinar3.id,
        gcDealId: 'attr-multi-att-3',
        attendedAt: new Date('2026-03-10T17:05:00Z'),
      },
    });

    // Order 1 hour after last attendance
    const result = await attributionService.attribute(
      contact,
      new Date('2026-03-10T18:05:00Z'),
    );

    expect(result.type).toBe('DIRECT');
    expect(result.webinarId).toBe(webinar3.id);
  });
});
