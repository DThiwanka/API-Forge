import { db } from '../src/config/database.js';

async function main() {
  console.log('[Prisma Seed] Starting minimal database connection check...');
  await db.$queryRawUnsafe('SELECT 1');
  console.log('[Prisma Seed] Database connection verified successfully.');
}

main()
  .catch((e) => {
    console.error('[Prisma Seed] Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (db?.$disconnect) {
      await db.$disconnect();
    }
  });
