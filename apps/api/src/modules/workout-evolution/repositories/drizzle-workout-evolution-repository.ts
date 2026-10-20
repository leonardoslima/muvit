import { db, schema } from '@muvit/db';
import type { WorkoutGoal } from '@muvit/validators';
import { and, eq, lte, sql } from 'drizzle-orm';
import type {
  WeeklyWorkoutSummary,
  WorkoutEvolutionReader,
  WorkoutGoalReader,
  WorkoutGoalWriter,
} from './workout-evolution-repository.js';

export class DrizzleWorkoutEvolutionRepository
  implements WorkoutEvolutionReader, WorkoutGoalReader, WorkoutGoalWriter
{
  async getWeeklySummary(studentId: string, date: string): Promise<WeeklyWorkoutSummary> {
    const weekStart = sql<string>`date_trunc('week', ${schema.workoutLogs.date}::timestamp)::date::text`;
    const completedWeeks = db.$with('completed_weeks').as(
      db
        .select({
          weekStart: weekStart.as('week_start'),
          completed: sql<number>`count(*)::int`.as('completed'),
        })
        .from(schema.workoutLogs)
        .where(
          and(
            eq(schema.workoutLogs.studentId, studentId),
            eq(schema.workoutLogs.completed, true),
            lte(schema.workoutLogs.date, date),
          ),
        )
        .groupBy(weekStart),
    );

    const rows = await db
      .with(completedWeeks)
      .select({
        weekStart: completedWeeks.weekStart,
        completed: completedWeeks.completed,
        weeklyGoal: schema.studentWorkoutGoals.weeklyGoal,
      })
      .from(schema.students)
      .leftJoin(
        schema.studentWorkoutGoals,
        eq(schema.studentWorkoutGoals.studentId, schema.students.id),
      )
      .leftJoin(completedWeeks, sql`true`)
      .where(eq(schema.students.id, studentId));

    return {
      weeklyGoal: rows[0]?.weeklyGoal ?? null,
      weeks: rows.flatMap((row) =>
        row.weekStart === null || row.completed === null
          ? []
          : [{ weekStart: row.weekStart, completed: row.completed }],
      ),
    };
  }

  async getGoal(studentId: string): Promise<WorkoutGoal> {
    const [goal] = await db
      .select({ weeklyGoal: schema.studentWorkoutGoals.weeklyGoal })
      .from(schema.studentWorkoutGoals)
      .where(eq(schema.studentWorkoutGoals.studentId, studentId));
    return { weeklyGoal: goal?.weeklyGoal ?? null };
  }

  async saveGoal(studentId: string, goal: WorkoutGoal): Promise<WorkoutGoal> {
    if (goal.weeklyGoal === null) {
      await db
        .delete(schema.studentWorkoutGoals)
        .where(eq(schema.studentWorkoutGoals.studentId, studentId));
      return { weeklyGoal: null };
    }

    await db
      .insert(schema.studentWorkoutGoals)
      .values({ studentId, weeklyGoal: goal.weeklyGoal })
      .onConflictDoUpdate({
        target: schema.studentWorkoutGoals.studentId,
        set: { weeklyGoal: goal.weeklyGoal },
      });
    return { weeklyGoal: goal.weeklyGoal };
  }
}
