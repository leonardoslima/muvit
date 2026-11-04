import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import {
  billingIntervalEnum,
  billingInvoiceStatusEnum,
  notificationChannelEnum,
  trainerPlanEnum,
  trainerSubscriptionStatusEnum,
} from './enums.js';
import { trainers } from './trainers.js';

export const trainerNotificationPreferences = pgTable('trainer_notification_preferences', {
  trainerId: uuid('trainer_id')
    .primaryKey()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  inactivityEnabled: boolean('inactivity_enabled').notNull().default(true),
  inactivityAfterDays: integer('inactivity_after_days').notNull().default(7),
  inactivityChannel: notificationChannelEnum('inactivity_channel').notNull().default('both'),
  workoutPlanExpiringEnabled: boolean('workout_plan_expiring_enabled').notNull().default(true),
  workoutPlanExpiringDaysBefore: integer('workout_plan_expiring_days_before').notNull().default(7),
  workoutPlanExpiringChannel: notificationChannelEnum('workout_plan_expiring_channel')
    .notNull()
    .default('email'),
  pendingAssessmentEnabled: boolean('pending_assessment_enabled').notNull().default(true),
  pendingAssessmentStaleAfterDays: integer('pending_assessment_stale_after_days')
    .notNull()
    .default(60),
  pendingAssessmentChannel: notificationChannelEnum('pending_assessment_channel')
    .notNull()
    .default('push'),
  newStudentRegistrationEnabled: boolean('new_student_registration_enabled')
    .notNull()
    .default(true),
  newStudentRegistrationChannel: notificationChannelEnum('new_student_registration_channel')
    .notNull()
    .default('both'),
});

export const trainerSubscriptions = pgTable('trainer_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  trainerId: uuid('trainer_id')
    .notNull()
    .unique()
    .references(() => trainers.id, { onDelete: 'cascade' }),
  plan: trainerPlanEnum('plan').notNull(),
  billingInterval: billingIntervalEnum('billing_interval').notNull(),
  status: trainerSubscriptionStatusEnum('status').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  renewsAt: timestamp('renews_at', { withTimezone: true }),
});

export const billingInvoices = pgTable(
  'billing_invoices',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    plan: trainerPlanEnum('plan').notNull(),
    billingInterval: billingIntervalEnum('billing_interval').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
    status: billingInvoiceStatusEnum('status').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    trainerIssuedAtIdx: index('billing_invoices_trainer_issued_at_idx').on(
      table.trainerId,
      table.issuedAt,
    ),
    amountPositive: check('billing_invoices_amount_cents_positive', sql`${table.amountCents} > 0`),
  }),
);

export type NewTrainerSubscription = typeof trainerSubscriptions.$inferInsert;
export type NewBillingInvoice = typeof billingInvoices.$inferInsert;
