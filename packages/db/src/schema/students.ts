import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { studentGenderEnum, studentStatusEnum } from './enums.js';
import { trainers } from './trainers.js';

export const students = pgTable(
  'students',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    trainerId: uuid('trainer_id').references(() => trainers.id, { onDelete: 'set null' }),
    isIndependent: boolean('is_independent').notNull().default(false),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    birthDate: date('birth_date'),
    gender: studentGenderEnum('gender'),
    goals: text('goals'),
    restrictions: text('restrictions'),
    status: studentStatusEnum('status').notNull().default('active'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trainerIdx: index('students_trainer_idx').on(t.trainerId),
    emailIdx: uniqueIndex('students_email_unique').on(t.email),
  }),
);

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
