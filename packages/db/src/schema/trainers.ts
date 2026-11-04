import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { authUsers } from './auth.js';
import { trainerPlanEnum } from './enums.js';

export const trainers = pgTable('trainers', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  authUserId: uuid('auth_user_id')
    .notNull()
    .unique()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 150 }).notNull(),
  avatarUrl: text('avatar_url'),
  phone: varchar('phone', { length: 20 }),
  bio: text('bio'),
  specialties: jsonb('specialties').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  plan: trainerPlanEnum('plan').notNull().default('free'),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Trainer = typeof trainers.$inferSelect;
export type NewTrainer = typeof trainers.$inferInsert;
