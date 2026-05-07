import { sql } from 'drizzle-orm';
import { db, queryClient } from '@muvit/db';

export async function truncateAll() {
  await db.execute(sql`
    TRUNCATE TABLE log_sets, workout_logs, workout_exercises, workout_days,
                   workout_plans, exercises, assessments, students, trainers
    RESTART IDENTITY CASCADE;
  `);
}

export async function closeDb() {
  await queryClient.end();
}
