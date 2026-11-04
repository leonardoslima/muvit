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

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

function plannedSessions(plans: ReportPlan[], period: ResolvedReportPeriod, today: string): number {
  const intervals = plans.flatMap((plan) => {
    const to = [period.to, plan.endDate, today]
      .filter((date): date is string => date !== null)
      .sort()
      .at(0);
    if (to === undefined) return [];
    const from =
      [period.from, plan.startDate]
        .filter((date): date is string => date !== null)
        .sort()
        .at(-1) ?? to;
    if (from > to) return [];
    return [{ from, to, workoutDays: plan.workoutDays }];
  });
  const anchor =
    period.from ??
    intervals
      .map((interval) => interval.from)
      .sort()
      .at(0);
  if (anchor === undefined) return 0;

  const anchorDay = utcDay(anchor);
  const goalsByWeek = new Map<number, number>();
  for (const interval of intervals) {
    const firstWeek = Math.floor((utcDay(interval.from) - anchorDay) / 7);
    const lastWeek = Math.floor((utcDay(interval.to) - anchorDay) / 7);
    for (let week = firstWeek; week <= lastWeek; week += 1) {
      goalsByWeek.set(week, Math.max(goalsByWeek.get(week) ?? 0, interval.workoutDays));
    }
  }
  return [...goalsByWeek.values()].reduce((total, goal) => total + goal, 0);
}

function metricChange(
  assessments: ReportAssessment[],
  select: (assessment: ReportAssessment) => number | null,
): number | null {
  const values = assessments.map(select).filter((value): value is number => value !== null);
  const first = values.at(0);
  const last = values.at(-1);
  if (values.length < 2 || first === undefined || last === undefined) return null;
  return difference(last, first);
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
      const totalVolumeKg = group.rows.reduce((volume, row) => {
        if (row.loadKg === null || row.repsDone === null) return volume;
        return volume + row.loadKg * row.repsDone;
      }, 0);
      return {
        exerciseId,
        name: group.name,
        maxLoadKg: loads.length > 0 ? Math.max(...loads) : null,
        totalSets: group.rows.length,
        totalVolumeKg: Number(totalVolumeKg.toFixed(2)),
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
    const now = this.now();
    const period = resolveReportPeriod(query, now);
    const [assessmentRows, logs, sets, plans] = await Promise.all([
      this.reportsRepository.listAssessments(studentId, period),
      this.reportsRepository.listWorkoutLogs(studentId, period),
      this.reportsRepository.listExerciseSets(studentId, period),
      this.reportsRepository.listPlans(studentId, period),
    ]);
    const assessments = [...assessmentRows].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
    const photos = assessments.flatMap((assessment) =>
      (assessment.photos ?? []).map((photoUrl) => ({ date: assessment.date, photoUrl })),
    );
    const before = photos.at(0) ?? null;
    const after = before
      ? ([...photos]
          .reverse()
          .find((photo) => photo.date !== before.date && photo.photoUrl !== before.photoUrl) ??
        null)
      : null;
    const changes = {
      weightKg: metricChange(assessments, (assessment) => assessment.weightKg),
      bodyFatPct: metricChange(assessments, (assessment) => assessment.bodyFatPct),
      waistCm: metricChange(assessments, (assessment) => measurement(assessment, 'waist')),
      armCm:
        metricChange(assessments, (assessment) => measurement(assessment, 'armRight')) ??
        metricChange(assessments, (assessment) => measurement(assessment, 'armLeft')),
    };
    const hasPhysicalEvolution = Object.values(changes).some((change) => change !== null);
    const completed = logs.filter((log) => log.completed).length;
    const today = formatDate(now);
    const planned = plannedSessions(plans, period, today);

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
        changes,
      },
      beforeAfter: {
        hasEnoughData: after !== null,
        before,
        after,
      },
      workoutAdherence: {
        hasEnoughData: planned > 0,
        completed,
        planned,
        percentage: planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : null,
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
