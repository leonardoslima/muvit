import postgres from 'postgres';
import { dbEnv } from './env.js';

const databaseNamePattern = /^[a-zA-Z0-9_]+$/;

async function main() {
  const targetUrl = new URL(dbEnv.DATABASE_URL);
  const databaseName = targetUrl.pathname.replace(/^\//, '');

  if (!databaseNamePattern.test(databaseName)) {
    throw new Error(`Nome de banco invalido para criacao automatica: ${databaseName}`);
  }

  const maintenanceUrl = new URL(targetUrl);
  maintenanceUrl.pathname = '/postgres';

  const sql = postgres(maintenanceUrl.toString(), { max: 1 });
  const existing = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = ${databaseName}) AS "exists"
  `;

  if (!existing[0]?.exists) {
    await sql.unsafe(`CREATE DATABASE "${databaseName}"`);
  }

  await sql.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
