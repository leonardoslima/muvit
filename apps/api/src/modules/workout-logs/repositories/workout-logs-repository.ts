import type {
  finishWorkoutLogSchema,
  listWorkoutLogsQuerySchema,
  startWorkoutLogSchema,
  workoutLogFullSchema,
} from '@muvit/validators';
import type { z } from 'zod';

export type StartWorkoutLogInput = z.infer<typeof startWorkoutLogSchema>;
export type FinishWorkoutLogInput = z.infer<typeof finishWorkoutLogSchema>;
export type ListWorkoutLogsQuery = z.infer<typeof listWorkoutLogsQuerySchema>;
export type WorkoutLogFullResponse = z.input<typeof workoutLogFullSchema>;
export type WorkoutLogAccess = { id: string; studentId: string };
export type WorkoutDayAccess = { id: string; studentId: string };
export type WorkoutLogSummary = {
  id: string;
  studentId: string;
  workoutDayId: string;
  date: string;
  durationMin: number | null;
  rpe: number | null;
  completed: boolean;
  createdAt: Date;
};

export interface WorkoutLogsRepository {
  findWorkoutDayAccess(workoutDayId: string): Promise<WorkoutDayAccess | null>;
  start(studentId: string, input: StartWorkoutLogInput): Promise<WorkoutLogSummary>;
  findById(id: string): Promise<WorkoutLogAccess | null>;
  finish(id: string, input: FinishWorkoutLogInput): Promise<WorkoutLogFullResponse | null>;
  findFullById(id: string): Promise<WorkoutLogFullResponse | null>;
  listForStudent(studentId: string, query: ListWorkoutLogsQuery): Promise<WorkoutLogSummary[]>;
}
