import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './client.js';

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  await queryClient.end();
  console.log('migrations applied');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
