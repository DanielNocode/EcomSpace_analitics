import { buildApp } from './app';
import { prisma } from './lib/prisma';

const PORT = parseInt(process.env.API_PORT ?? '3000', 10);

async function main(): Promise<void> {
  const app = await buildApp();

  // Run migrations in development
  if (process.env.NODE_ENV === 'development') {
    try {
      const { execSync } = await import('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migrations applied successfully');
    } catch (e) {
      console.error('Migration failed:', e);
    }
  }

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
