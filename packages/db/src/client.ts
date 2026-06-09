import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dbEnv } from './env.js';
import * as schema from './schema/index.js';

export const queryClient = postgres(dbEnv.DATABASE_URL);
export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
