import { db, schema } from '@muvit/db';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { TrainerSummaryRepository } from './trainer-summary-repository.js';

export class DrizzleTrainerSummaryRepository implements TrainerSummaryRepository {
  async getSummary(trainerId: string, now: Date) {
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10);
    const since7dDate = since7d.toISOString().slice(0, 10);
    const since60dDate = since60d.toISOString().slice(0, 10);
    const in7dDate = in7d.toISOString().slice(0, 10);

    const studentsRows = await db
      .select({
        id: schema.students.id,
        status: schema.students.status,
        createdAt: schema.students.createdAt,
      })
      .from(schema.students)
      .where(eq(schema.students.trainerId, trainerId));

    const total = studentsRows.length;
    const active = studentsRows.filter((student) => student.status === 'active').length;
    const paused = studentsRows.filter((student) => student.status === 'paused').length;
    const inactive = studentsRows.filter((student) => student.status === 'inactive').length;
    const newThisWeek = studentsRows.filter((student) => student.createdAt >= since7d).length;
    const recentWorkoutRows = await db
      .selectDistinct({ studentId: schema.workoutLogs.studentId })
      .from(schema.workoutLogs)
      .innerJoin(schema.students, eq(schema.students.id, schema.workoutLogs.studentId))
      .where(
        and(
          eq(schema.students.trainerId, trainerId),
          eq(schema.students.status, 'active'),
          eq(schema.workoutLogs.completed, true),
          gte(schema.workoutLogs.date, since7dDate),
        ),
      );
    const recentWorkoutStudentIds = new Set(recentWorkoutRows.map((row) => row.studentId));
    const inactive7d = studentsRows.filter(
      (student) =>
        student.status === 'active' &&
        student.createdAt < since7d &&
        !recentWorkoutStudentIds.has(student.id),
    ).length;

    const activePlansRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.workoutPlans)
      .where(
        and(eq(schema.workoutPlans.trainerId, trainerId), eq(schema.workoutPlans.status, 'active')),
      );
    const activePlans = activePlansRow[0]?.count ?? 0;
    const expiringThisWeekRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.workoutPlans)
      .where(
        and(
          eq(schema.workoutPlans.trainerId, trainerId),
          eq(schema.workoutPlans.status, 'active'),
          gte(schema.workoutPlans.endDate, today),
          lte(schema.workoutPlans.endDate, in7dDate),
        ),
      );
    const expiringThisWeek = expiringThisWeekRow[0]?.count ?? 0;

    const last30dRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.assessments)
      .innerJoin(schema.students, eq(schema.students.id, schema.assessments.studentId))
      .where(
        and(eq(schema.students.trainerId, trainerId), gte(schema.assessments.createdAt, since30d)),
      );
    const last30d = last30dRow[0]?.count ?? 0;
    const latestAssessmentRows = await db
      .select({
        studentId: schema.assessments.studentId,
        latestDate: sql<string>`max(${schema.assessments.date})`,
      })
      .from(schema.assessments)
      .innerJoin(schema.students, eq(schema.students.id, schema.assessments.studentId))
      .where(and(eq(schema.students.trainerId, trainerId), eq(schema.students.status, 'active')))
      .groupBy(schema.assessments.studentId);
    const latestAssessmentByStudent = new Map(
      latestAssessmentRows.map((row) => [row.studentId, row.latestDate]),
    );
    const pending = studentsRows.filter(
      (student) =>
        student.status === 'active' &&
        (latestAssessmentByStudent.get(student.id) ?? '') < since60dDate,
    ).length;

    return {
      students: { total, active, paused, inactive, newThisWeek, inactive7d },
      workouts: { activePlans, expiringThisWeek },
      assessments: { last30d, pending },
    };
  }
}
