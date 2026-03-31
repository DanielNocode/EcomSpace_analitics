import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Pre-computed bcrypt hashes (rounds=10)
const users = [
  { email: 'admin@ecomspace.ru', name: 'Admin', passwordHash: '$2b$10$jXl65NPTQhNBCpkR1qs4Ce6SZZD6Z5iJ8/xW3Z0DnY80azUubrROu', role: 'ADMIN' },
  { email: 'anna@ecomspace.ru', name: 'Анна', passwordHash: '$2b$10$8tXt6AYdHQ3E6F4tTWaZDeGZX4WX.g.HZFL84mFVjZSj2U.n0/FWm', role: 'VIEWER' },
  { email: 'anastasia@ecomspace.ru', name: 'Анастасия', passwordHash: '$2b$10$8tXt6AYdHQ3E6F4tTWaZDeGZX4WX.g.HZFL84mFVjZSj2U.n0/FWm', role: 'VIEWER' },
];

async function main() {
  console.log('Seeding database...');

  await prisma.setting.upsert({
    where: { key: 'attribution_window_hours' },
    update: {},
    create: { key: 'attribution_window_hours', value: '72' },
  });
  console.log('Created default setting: attribution_window_hours = 72');

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, password: u.passwordHash, role: u.role },
    });
    console.log(`Created user: ${u.name} (${u.email}) — role: ${u.role}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
