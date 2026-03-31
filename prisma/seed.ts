import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'VIEWER';
}

const users: SeedUser[] = [
  {
    email: 'admin@ecomspace.ru',
    name: 'Admin',
    password: 'admin123',
    role: 'ADMIN',
  },
  {
    email: 'anna@ecomspace.ru',
    name: 'Анна',
    password: 'viewer123',
    role: 'VIEWER',
  },
  {
    email: 'anastasia@ecomspace.ru',
    name: 'Анастасия',
    password: 'viewer123',
    role: 'VIEWER',
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Create default settings
  await prisma.setting.upsert({
    where: { key: 'attribution_window_hours' },
    update: {},
    create: { key: 'attribution_window_hours', value: '72' },
  });

  console.log('Created default setting: attribution_window_hours = 72');

  // Create users
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);

    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: passwordHash,
        role: u.role,
      },
    });

    console.log(`Created user: ${u.name} (${u.email}) — role: ${u.role}`);
  }

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
