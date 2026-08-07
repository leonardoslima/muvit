import { type ReportQuery, type StudentReport, studentReportSchema } from '@muvit/validators';
import type { RequestIdentity } from '../../../shared/request-identity.js';
import type { StudentAccessPolicy } from '../../students/use-cases/student-access-policy.js';
import { type ResolvedReportPeriod, resolveReportPeriod } from '../report-period.js';
import { buildReportSummary } from '../report-summary.js';
import type {
  ReportAssessment,
  ReportExerciseSet,
  ReportPlan,
  ReportWorkoutLog,
  ReportsRepository,
} from '../repositories/reports-repository.js';

function difference(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Number((current - previous).toFixed(2));
}

function measurement(row: ReportAssessment, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = row.measurements?.[key];
    if (value !== undefined) return value;
  }
  return null;
}

function daysBetweenInclusive(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((toTime - fromTime) / 86_400_000) + 1;
}

function plannedSessions(plans: ReportPlan[], period: ResolvedReportPeriod): number {
  return plans.reduce((total, plan) => {
    const from = [period.from, plan.startDate]
      .filter((date): date is string => date !== null)
      .sort()
      .at(-1);
    const to = [period.to, plan.endDate]
      .filter((date): date is string => date !== null)
      .sort()
      .at(0);

    if (from === undefined || to === undefined) return total + plan.workoutDays;
    if (from > to) return total;
    return total + Math.ceil(daysBetweenInclusive(from, to) / 7) * plan.workoutDays;
  }, 0);
}

function buildFrequency(logs: ReportWorkoutLog[]): StudentReport['trainingFrequency'] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (!log.completed) continue;
    counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
  }
  const days = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, count]) => ({ date, count }));
  return { hasEnoughData: days.length > 0, days };
}

function buildRpeTrend(logs: ReportWorkoutLog[]): StudentReport['rpeTrend'] {
  const groups = new Map<string, number[]>();
  for (const log of logs) {
    if (!log.completed || log.rpe === null) continue;
    groups.set(log.date, [...(groups.get(log.date) ?? []), log.rpe]);
  }
  const points = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, values]) => ({
      date,
      averageRpe: Number(
        (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
      ),
    }));
  return { hasEnoughData: points.length > 0, points };
}

function buildTopExercises(sets: ReportExerciseSet[]): StudentReport['topExercises'] {
  const groups = new Map<string, { name: string; rows: ReportExerciseSet[] }>();
  for (const set of sets) {
    if (!set.completed) continue;
    const current = groups.get(set.exerciseId);
    groups.set(set.exerciseId, { name: set.name, rows: [...(current?.rows ?? []), set] });
  }
  const items = [...groups.entries()]
    .map(([exerciseId, group]) => {
      const progression = group.rows
        .filter((row): row is ReportExerciseSet & { loadKg: number } => row.loadKg !== null)
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((row) => ({ date: row.date, loadKg: row.loadKg }));
      const loads = progression.map((point) => point.loadKg);
      return {
        exerciseId,
        name: group.name,
        maxLoadKg: loads.length > 0 ? Math.max(...loads) : null,
        totalSets: group.rows.length,
        progression,
      };
    })
    .sort((left, right) => right.totalSets - left.totalSets || left.name.localeCompare(right.name));
  return { hasEnoughData: items.length > 0, items };
}

export class GetStudentReportUseCase {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly ensureStudentAccess: StudentAccessPolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    identity: RequestIdentity,
    studentId: string,
    query: ReportQuery,
  ): Promise<StudentReport> {
    const student = await this.ensureStudentAccess.execute(identity, studentId);
    const period = resolveReportPeriod(query, this.now());
    const [assessmentRows, logs, sets, plans] = await Promise.all([
      this.reportsRepository.listAssessments(studentId, period),
      this.reportsRepository.listWorkoutLogs(studentId, period),
      this.reportsRepository.listExerciseSets(studentId, period),
      this.reportsRepository.listPlans(studentId, period),
    ]);
    const assessments = [...assessmentRows].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
    const first = assessments.at(0) ?? null;
    const last = assessments.at(-1) ?? null;
    const photos = assessments.flatMap((assessment) =>
      (assessment.photos ?? []).map((photoUrl) => ({ date: assessment.date, photoUrl })),
    );
    const hasPhysicalEvolution = assessments.length >= 2;
    const completed = logs.filter((log) => log.completed).length;
    const planned = plannedSessions(plans, period);

    const report: StudentReport = {
      student: { id: student.id, name: student.name, avatarUrl: student.avatarUrl },
      period: { range: query.range, ...period },
      physicalEvolution: {
        hasEnoughData: hasPhysicalEvolution,
        points: assessments.map((assessment) => ({
          date: assessment.date,
          weightKg: assessment.weightKg,
          bodyFatPct: assessment.bodyFatPct,
          measurements: assessment.measurements,
        })),
        changes: {
          weightKg:
            hasPhysicalEvolution && first && last
              ? difference(last.weightKg, first.weightKg)
              : null,
          bodyFatPct:
            hasPhysicalEvolution && first && last
              ? difference(last.bodyFatPct, first.bodyFatPct)
              : null,
          waistCm:
            hasPhysicalEvolution && first && last
              ? difference(measurement(last, 'waist'), measurement(first, 'waist'))
              : null,
          armCm:
            hasPhysicalEvolution && first && last
              ? difference(
                  measurement(last, 'armRight', 'armLeft'),
                  measurement(first, 'armRight', 'armLeft'),
                )
              : null,
        },
      },
      beforeAfter: {
        hasEnoughData: photos.length >= 2,
        before: photos.at(0) ?? null,
        after: photos.length >= 2 ? (photos.at(-1) ?? null) : null,
      },
      workoutAdherence: {
        hasEnoughData: planned > 0,
        completed,
        planned,
        percentage: planned > 0 ? Math.round((completed / planned) * 100) : null,
      },
      trainingFrequency: buildFrequency(logs),
      topExercises: buildTopExercises(sets),
      rpeTrend: buildRpeTrend(logs),
      summary: '',
    };
    report.summary = buildReportSummary(report);
    return studentReportSchema.parse(report);
  }
}
