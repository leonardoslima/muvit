import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { muscleGroupEnum } from './enums.js';
import { trainers } from './trainers.js';

export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  trainerId: uuid('trainer_id').references(() => trainers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  muscleGroup: muscleGroupEnum('muscle_group').notNull(),
  equipment: varchar('equipment', { length: 100 }),
  videoUrl: text('video_url'),
  instructions: text('instructions'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
