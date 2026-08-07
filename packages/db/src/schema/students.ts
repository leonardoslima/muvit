import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { authUsers } from './auth.js';
import { studentGenderEnum, studentStatusEnum } from './enums.js';
import { trainers } from './trainers.js';

export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    authUserId: uuid('auth_user_id')
      .unique()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    trainerId: uuid('trainer_id').references(() => trainers.id, { onDelete: 'set null' }),
    isIndependent: boolean('is_independent').notNull().default(false),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    birthDate: date('birth_date'),
    gender: studentGenderEnum('gender'),
    goals: text('goals'),
    trainingDays: integer('training_days'),
    restrictions: text('restrictions'),
    internalNotes: text('internal_notes'),
    status: studentStatusEnum('status').notNull().default('active'),
    avatarUrl: text('avatar_url'),
    expoPushToken: varchar('expo_push_token', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trainerIdx: index('students_trainer_idx').on(t.trainerId),
    emailIdx: uniqueIndex('students_email_unique').on(t.email),
    trainingDaysCheck: check(
      'students_training_days_check',
      sql`${t.trainingDays} BETWEEN 1 AND 7`,
    ),
  }),
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
