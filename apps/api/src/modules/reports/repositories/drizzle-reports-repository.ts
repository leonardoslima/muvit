import { db, schema } from '@muvit/db';
import { and, asc, count, eq, gte, isNull, lte, ne, or } from 'drizzle-orm';
import type { ResolvedReportPeriod } from '../report-period.js';
import type {
  ReportAssessment,
  ReportExerciseSet,
  ReportPlan,
  ReportWorkoutLog,
  ReportsRepository,
} from './reports-repository.js';

function dateConditions(
  studentColumn: typeof schema.assessments.studentId | typeof schema.workoutLogs.studentId,
  dateColumn: typeof schema.assessments.date | typeof schema.workoutLogs.date,
  studentId: string,
  period: ResolvedReportPeriod,
) {
  const conditions = [eq(studentColumn, studentId)];
  if (period.from) conditions.push(gte(dateColumn, period.from));
  if (period.to) conditions.push(lte(dateColumn, period.to));
  return and(...conditions);
}

export class DrizzleReportsRepository implements ReportsRepository {
  async listAssessments(
    studentId: string,
    period: ResolvedReportPeriod,
  ): Promise<ReportAssessment[]> {
    const rows = await db
      .select({
        date: schema.assessments.date,
        weightKg: schema.assessments.weightKg,
        bodyFatPct: schema.assessments.bodyFatPct,
        measurements: schema.assessments.measurements,
        photos: schema.assessments.photos,
      })
      .from(schema.assessments)
      .where(
        dateConditions(schema.assessments.studentId, schema.assessments.date, studentId, period),
      )
      .orderBy(asc(schema.assessments.date), asc(schema.assessments.id));

    return rows.map((row) => ({
      date: row.date,
      weightKg: row.weightKg === null ? null : Number(row.weightKg),
      bodyFatPct: row.bodyFatPct === null ? null : Number(row.bodyFatPct),
      measurements: row.measurements ? Object.fromEntries(Object.entries(row.measurements)) : null,
      photos: row.photos ?? null,
    }));
  }

  async listWorkoutLogs(
    studentId: string,
    period: ResolvedReportPeriod,
  ): Promise<ReportWorkoutLog[]> {
    return db
      .select({
        date: schema.workoutLogs.date,
        completed: schema.workoutLogs.completed,
        rpe: schema.workoutLogs.rpe,
      })
      .from(schema.workoutLogs)
      .where(
        dateConditions(schema.workoutLogs.studentId, schema.workoutLogs.date, studentId, period),
      )
      .orderBy(asc(schema.workoutLogs.date), asc(schema.workoutLogs.id));
  }

  async listExerciseSets(
    studentId: string,
    period: ResolvedReportPeriod,
  ): Promise<ReportExerciseSet[]> {
    const rows = await db
      .select({
        date: schema.workoutLogs.date,
        exerciseId: schema.exercises.id,
        name: schema.exercises.name,
        loadKg: schema.logSets.loadKg,
        completed: schema.logSets.completed,
      })
      .from(schema.logSets)
      .innerJoin(schema.workoutLogs, eq(schema.workoutLogs.id, schema.logSets.workoutLogId))
      .innerJoin(
        schema.workoutExercises,
        eq(schema.workoutExercises.id, schema.logSets.workoutExerciseId),
      )
      .innerJoin(schema.exercises, eq(schema.exercises.id, schema.workoutExercises.exerciseId))
      .where(
        dateConditions(schema.workoutLogs.studentId, schema.workoutLogs.date, studentId, period),
      )
      .orderBy(
        asc(schema.workoutLogs.date),
        asc(schema.exercises.name),
        asc(schema.logSets.setNumber),
        asc(schema.logSets.id),
      );

    return rows.map((row) => ({
      ...row,
      loadKg: row.loadKg === null ? null : Number(row.loadKg),
    }));
  }

  async listPlans(studentId: string, period: ResolvedReportPeriod): Promise<ReportPlan[]> {
    const conditions = [
      eq(schema.workoutPlans.studentId, studentId),
      ne(schema.workoutPlans.status, 'draft'),
    ];
    if (period.from) {
      const endsWithinPeriod = or(
        isNull(schema.workoutPlans.endDate),
        gte(schema.workoutPlans.endDate, period.from),
      );
      if (endsWithinPeriod) conditions.push(endsWithinPeriod);
    }
    if (period.to) {
      const startsWithinPeriod = or(
        isNull(schema.workoutPlans.startDate),
        lte(schema.workoutPlans.startDate, period.to),
      );
      if (startsWithinPeriod) conditions.push(startsWithinPeriod);
    }

    return db
      .select({
        startDate: schema.workoutPlans.startDate,
        endDate: schema.workoutPlans.endDate,
        workoutDays: count(schema.workoutDays.id).mapWith(Number),
      })
      .from(schema.workoutPlans)
      .leftJoin(schema.workoutDays, eq(schema.workoutDays.planId, schema.workoutPlans.id))
      .where(and(...conditions))
      .groupBy(schema.workoutPlans.id, schema.workoutPlans.startDate, schema.workoutPlans.endDate)
      .orderBy(asc(schema.workoutPlans.startDate), asc(schema.workoutPlans.id));
  }
}
