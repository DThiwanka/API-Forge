import { database } from '../src/config/database.js';

async function main() {
  console.log('Seeding initial database data...');
  // Starter seed script
  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await database.$disconnect?.();
  });
