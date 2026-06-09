import { loadEnvFile } from 'node:process';

loadEnvFile(new URL('../.env.test', import.meta.url));

process.env.NODE_ENV = 'test';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL deve existir em apps/api/.env.test para rodar os testes.');
}

if (!new URL(databaseUrl).pathname.includes('test')) {
  throw new Error('Os testes da API devem usar um banco dedicado de teste.');
}
