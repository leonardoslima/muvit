import { sql } from 'drizzle-orm';
import { date, decimal, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { students } from './students.js';

export type AssessmentMeasurements = {
  chest?: number;
  waist?: number;
  hip?: number;
  armRight?: number;
  armLeft?: number;
  thighRight?: number;
  thighLeft?: number;
  calfRight?: number;
  calfLeft?: number;
};

export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  weightKg: decimal('weight_kg', { precision: 5, scale: 2 }),
  heightCm: decimal('height_cm', { precision: 5, scale: 1 }),
  bodyFatPct: decimal('body_fat_pct', { precision: 4, scale: 1 }),
  measurements: jsonb('measurements').$type<AssessmentMeasurements>(),
  photos: jsonb('photos').$type<string[]>(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  studentDateIdx: index('assessments_student_date_idx').on(t.studentId, t.date),
}));

export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
