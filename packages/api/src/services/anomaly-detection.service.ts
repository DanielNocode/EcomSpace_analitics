/**
 * AnomalyDetectionService — автоматическое обнаружение аномалий в данных вебинаров.
 *
 * Типы аномалий:
 * - LOW_REACH_RATE: доходимость резко упала (< порога)
 * - ZERO_PAYMENTS_WITH_ORDERS: есть заказы, но нет оплат за день
 * - REGISTRATION_SPIKE: всплеск регистраций из одного источника (возможный фрод)
 */

import { prisma } from '../lib/prisma';

const THRESHOLDS = {
  MIN_REACH_RATE: 0.05, // 5%
  REGISTRATION_SPIKE: 50, // > 50 регистраций из одного источника за час
};

class AnomalyDetectionService {
  /**
   * Запустить все детекторы аномалий.
   * Вызывать периодически (например, после каждого вебинара).
   */
  async detectAll(): Promise<number> {
    const detected = await Promise.all([
      this.detectLowReachRate(),
      this.detectZeroPayments(),
      this.detectRegistrationSpike(),
    ]);

    return detected.reduce((sum, n) => sum + n, 0);
  }

  /**
   * Детектор: низкая доходимость (< MIN_REACH_RATE).
   */
  async detectLowReachRate(): Promise<number> {
    // Check last 7 days of webinars
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const webinars = await prisma.webinar.findMany({
      where: { scheduledAt: { gte: cutoff }, status: 'COMPLETED' },
      include: {
        _count: { select: { registrations: true, attendances: true } },
      },
    });

    let count = 0;

    for (const webinar of webinars) {
      const regs = webinar._count.registrations;
      const atts = webinar._count.attendances;
      if (regs < 10) continue; // Skip small webinars

      const reachRate = atts / regs;
      if (reachRate < THRESHOLDS.MIN_REACH_RATE) {
        // Check if this anomaly was already detected
        const existing = await prisma.anomaly.findFirst({
          where: {
            type: 'LOW_REACH_RATE',
            webinarId: webinar.id,
            resolved: false,
          },
        });

        if (!existing) {
          await prisma.anomaly.create({
            data: {
              type: 'LOW_REACH_RATE',
              severity: 'WARNING',
              message: `Низкая доходимость ${Math.round(reachRate * 100)}% для вебинара ${webinar.scheduledAt.toISOString().slice(0, 10)} (${atts} из ${regs})`,
              metadata: { webinarId: webinar.id, reachRate, registrations: regs, attendances: atts },
              webinarId: webinar.id,
            },
          });
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Детектор: заказы без оплат за последние 24 часа.
   */
  async detectZeroPayments(): Promise<number> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const [orders, payments] = await Promise.all([
      prisma.order.count({ where: { orderedAt: { gte: yesterday }, status: 'NEW' } }),
      prisma.order.count({ where: { orderedAt: { gte: yesterday }, status: 'PAID' } }),
    ]);

    if (orders >= 5 && payments === 0) {
      // Check if already detected today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await prisma.anomaly.findFirst({
        where: {
          type: 'ZERO_PAYMENTS_WITH_ORDERS',
          detectedAt: { gte: today },
          resolved: false,
        },
      });

      if (!existing) {
        await prisma.anomaly.create({
          data: {
            type: 'ZERO_PAYMENTS_WITH_ORDERS',
            severity: 'ERROR',
            message: `${orders} заказов без оплат за последние 24 часа. Возможна проблема с платёжной системой.`,
            metadata: { ordersCount: orders, paymentsCount: payments },
          },
        });
        return 1;
      }
    }

    return 0;
  }

  /**
   * Детектор: всплеск регистраций из одного источника.
   */
  async detectRegistrationSpike(): Promise<number> {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const groups = await prisma.registration.groupBy({
      by: ['utmSource'],
      where: {
        registeredAt: { gte: oneHourAgo },
        utmSource: { not: null },
      },
      _count: true,
      having: {
        _count: { _all: { gte: THRESHOLDS.REGISTRATION_SPIKE } },
      },
    });

    let count = 0;

    for (const group of groups) {
      if (!group.utmSource) continue;

      const existing = await prisma.anomaly.findFirst({
        where: {
          type: 'REGISTRATION_SPIKE',
          detectedAt: { gte: oneHourAgo },
          resolved: false,
        },
      });

      if (!existing) {
        await prisma.anomaly.create({
          data: {
            type: 'REGISTRATION_SPIKE',
            severity: 'WARNING',
            message: `Всплеск регистраций: ${group._count} регистраций из источника "${group.utmSource}" за последний час. Возможный фрод.`,
            metadata: { utmSource: group.utmSource, count: group._count },
          },
        });
        count++;
      }
    }

    return count;
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
