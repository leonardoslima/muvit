import { db, schema } from '@muvit/db';
import { and, desc, eq, gte } from 'drizzle-orm';
import type { NotificationsRepository } from './notifications-repository.js';

export class DrizzleNotificationsRepository implements NotificationsRepository {
  async listActiveStudents() {
    return db.query.students.findMany({
      with: { trainer: true },
      where: eq(schema.students.status, 'active'),
    });
  }

  async hasRecentWorkoutLog(studentId: string, inactiveSince: string) {
    const recentLog = await db.query.workoutLogs.findFirst({
      where: and(
        eq(schema.workoutLogs.studentId, studentId),
        gte(schema.workoutLogs.date, inactiveSince),
      ),
    });
    return Boolean(recentLog);
  }

  async findLastAssessmentDate(studentId: string) {
    const lastAssessment = await db.query.assessments.findFirst({
      where: eq(schema.assessments.studentId, studentId),
      orderBy: desc(schema.assessments.date),
      columns: { date: true },
    });
    return lastAssessment?.date ?? null;
  }
}
