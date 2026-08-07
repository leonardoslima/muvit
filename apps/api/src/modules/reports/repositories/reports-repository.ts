import type { ResolvedReportPeriod } from '../report-period.js';

export type ReportAssessment = {
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  measurements: Record<string, number> | null;
  photos: string[] | null;
};

export type ReportWorkoutLog = {
  date: string;
  completed: boolean;
  rpe: number | null;
};

export type ReportExerciseSet = {
  date: string;
  exerciseId: string;
  name: string;
  loadKg: number | null;
  completed: boolean;
};

export type ReportPlan = {
  startDate: string | null;
  endDate: string | null;
  workoutDays: number;
};

export interface ReportsRepository {
  listAssessments(studentId: string, period: ResolvedReportPeriod): Promise<ReportAssessment[]>;
  listWorkoutLogs(studentId: string, period: ResolvedReportPeriod): Promise<ReportWorkoutLog[]>;
  listExerciseSets(studentId: string, period: ResolvedReportPeriod): Promise<ReportExerciseSet[]>;
  listPlans(studentId: string, period: ResolvedReportPeriod): Promise<ReportPlan[]>;
}
