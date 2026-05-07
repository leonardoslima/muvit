import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { workoutPlanStatusEnum } from './enums.js';
import { exercises } from './exercises.js';
import { students } from './students.js';
import { trainers } from './trainers.js';

export const workoutPlans = pgTable(
  'workout_plans',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id').references(() => trainers.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 200 }).notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    status: workoutPlanStatusEnum('status').notNull().default('draft'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studentIdx: index('workout_plans_student_idx').on(t.studentId),
  }),
);

export const workoutDays = pgTable(
  'workout_days',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    planId: uuid('plan_id')
      .notNull()
      .references(() => workoutPlans.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 50 }).notNull(),
    dayOrder: integer('day_order').notNull(),
  },
  (t) => ({
    planIdx: index('workout_days_plan_idx').on(t.planId),
  }),
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    workoutDayId: uuid('workout_day_id')
      .notNull()
      .references(() => workoutDays.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    exerciseOrder: integer('exercise_order').notNull(),
    sets: integer('sets').notNull(),
    reps: varchar('reps', { length: 20 }).notNull(),
    restSeconds: integer('rest_seconds'),
    loadKg: decimal('load_kg', { precision: 5, scale: 1 }),
    tempo: varchar('tempo', { length: 10 }),
    notes: text('notes'),
  },
  (t) => ({
    dayIdx: index('workout_exercises_day_idx').on(t.workoutDayId),
  }),
);

export const workoutLogs = pgTable(
  'workout_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    workoutDayId: uuid('workout_day_id')
      .notNull()
      .references(() => workoutDays.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    durationMin: integer('duration_min'),
    rpe: integer('rpe'),
    notes: text('notes'),
    completed: boolean('completed').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studentDateIdx: index('workout_logs_student_date_idx').on(t.studentId, t.date),
  }),
);

export const logSets = pgTable(
  'log_sets',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    workoutLogId: uuid('workout_log_id')
      .notNull()
      .references(() => workoutLogs.id, { onDelete: 'cascade' }),
    workoutExerciseId: uuid('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    repsDone: integer('reps_done'),
    loadKg: decimal('load_kg', { precision: 5, scale: 1 }),
    completed: boolean('completed').notNull().default(false),
  },
  (t) => ({
    logIdx: index('log_sets_log_idx').on(t.workoutLogId),
  }),
);

export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type NewWorkoutPlan = typeof workoutPlans.$inferInsert;
export type WorkoutDay = typeof workoutDays.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type LogSet = typeof logSets.$inferSelect;
