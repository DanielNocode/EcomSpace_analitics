import { PrismaClient } from '@prisma/client';
import { beforeEach, afterAll } from 'vitest';

const testDatabaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;

// Override DATABASE_URL for tests
if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
}

// Ensure test API key is set
if (!process.env.WEBHOOK_API_KEY) {
  process.env.WEBHOOK_API_KEY = 'test-api-key';
}

process.env.NODE_ENV = 'test';

const prisma = new PrismaClient();

beforeEach(async () => {
  // Clean all tables before each test (order matters due to FK constraints)
  await prisma.$transaction([
    prisma.order.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.registration.deleteMany(),
    prisma.webinar.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.webhookLog.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Seed default settings
  await prisma.setting.create({
    data: { key: 'attribution_window_hours', value: '72' },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
