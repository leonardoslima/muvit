import { sql } from 'drizzle-orm';
import { check, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { students } from './students.js';

export const studentWorkoutGoals = pgTable(
  'student_workout_goals',
  {
    studentId: uuid('student_id')
      .primaryKey()
      .references(() => students.id, { onDelete: 'cascade' }),
    weeklyGoal: integer('weekly_goal').notNull(),
  },
  (t) => ({
    weeklyGoalCheck: check(
      'student_workout_goals_weekly_goal_check',
      sql`${t.weeklyGoal} BETWEEN 1 AND 7`,
    ),
  }),
);

export type StudentWorkoutGoal = typeof studentWorkoutGoals.$inferSelect;
export type NewStudentWorkoutGoal = typeof studentWorkoutGoals.$inferInsert;
