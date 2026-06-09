import { db, schema } from '@muvit/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import type { TrainerSummaryRepository } from './trainer-summary-repository.js';

export class DrizzleTrainerSummaryRepository implements TrainerSummaryRepository {
  async getSummary(trainerId: string, now: Date) {
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const studentsRows = await db
      .select({ status: schema.students.status, createdAt: schema.students.createdAt })
      .from(schema.students)
      .where(eq(schema.students.trainerId, trainerId));

    const total = studentsRows.length;
    const active = studentsRows.filter((student) => student.status === 'active').length;
    const paused = studentsRows.filter((student) => student.status === 'paused').length;
    const inactive = studentsRows.filter((student) => student.status === 'inactive').length;
    const newThisWeek = studentsRows.filter((student) => student.createdAt >= since7d).length;

    const activePlansRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.workoutPlans)
      .where(
        and(eq(schema.workoutPlans.trainerId, trainerId), eq(schema.workoutPlans.status, 'active')),
      );
    const activePlans = activePlansRow[0]?.count ?? 0;

    const last30dRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.assessments)
      .innerJoin(schema.students, eq(schema.students.id, schema.assessments.studentId))
      .where(
        and(eq(schema.students.trainerId, trainerId), gte(schema.assessments.createdAt, since30d)),
      );
    const last30d = last30dRow[0]?.count ?? 0;

    return {
      students: { total, active, paused, inactive, newThisWeek },
      workouts: { activePlans },
      assessments: { last30d },
    };
  }
}
