import { prisma } from '../lib/prisma';

export const webhookLogService = {
  async log(eventType: string, payload: unknown): Promise<string> {
    const entry = await prisma.webhookLog.create({
      data: {
        eventType,
        payload: payload as object,
        processed: false,
      },
    });
    return entry.id;
  },

  async markProcessed(id: string): Promise<void> {
    await prisma.webhookLog.update({
      where: { id },
      data: { processed: true },
    });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.webhookLog.update({
      where: { id },
      data: { processed: false, error },
    });
  },
};
