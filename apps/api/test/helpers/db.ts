import { db, queryClient } from '@muvit/db';
import { sql } from 'drizzle-orm';

export async function truncateAll() {
  await db.execute(sql`
    TRUNCATE TABLE auth_verifications, auth_accounts, auth_sessions, auth_users,
                   log_sets, workout_logs, workout_exercises, workout_days,
                   workout_plans, exercises, assessments, students, trainers
    RESTART IDENTITY CASCADE;
  `);
}

export async function closeDb() {
  await queryClient.end();
}
