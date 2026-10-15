import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { students } from './students.js';
import { trainers } from './trainers.js';
import { workoutPlans } from './workouts.js';

type PersistedWorkoutPlanDraftPayload = {
  name: string;
  notes?: string;
  days: {
    label: string;
    dayOrder: number;
    exercises: {
      exerciseId: string;
      exerciseOrder: number;
      sets: number;
      reps: string;
      restSeconds?: number;
      loadKg?: number;
      tempo?: string;
      notes?: string;
    }[];
  }[];
};

export const workoutPlanDrafts = pgTable(
  'workout_plan_drafts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    sourcePlanId: uuid('source_plan_id').references(() => workoutPlans.id, {
      onDelete: 'cascade',
    }),
    payload: jsonb('payload').$type<PersistedWorkoutPlanDraftPayload>().notNull(),
    selectedDayOrder: integer('selected_day_order').notNull(),
    revision: integer('revision').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trainerStudentIdx: index('workout_plan_drafts_trainer_student_idx').on(
      t.trainerId,
      t.studentId,
    ),
    createContextUniqueIdx: uniqueIndex('workout_plan_drafts_create_context_unique')
      .on(t.trainerId, t.studentId)
      .where(sql`${t.sourcePlanId} is null`),
    sourcePlanContextUniqueIdx: uniqueIndex('workout_plan_drafts_source_context_unique')
      .on(t.trainerId, t.studentId, t.sourcePlanId)
      .where(sql`${t.sourcePlanId} is not null`),
    selectedDayOrderCheck: check(
      'workout_plan_drafts_selected_day_order_check',
      sql`${t.selectedDayOrder} >= 0`,
    ),
    revisionCheck: check('workout_plan_drafts_revision_check', sql`${t.revision} >= 1`),
  }),
);

export type WorkoutPlanDraftRecord = typeof workoutPlanDrafts.$inferSelect;
export type NewWorkoutPlanDraftRecord = typeof workoutPlanDrafts.$inferInsert;
