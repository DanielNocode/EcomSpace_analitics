import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Create default settings
  await prisma.setting.upsert({
    where: { key: 'attribution_window_hours' },
    update: {},
    create: { key: 'attribution_window_hours', value: '72' },
  });

  console.log('Created default setting: attribution_window_hours = 72');

  // Create default admin user
  const passwordHash = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: passwordHash,
    },
  });

  console.log('Created default user: admin / admin');
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
