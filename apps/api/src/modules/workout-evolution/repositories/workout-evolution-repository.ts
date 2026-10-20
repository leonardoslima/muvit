import type { WorkoutGoal } from '@muvit/validators';

export type WeeklyWorkoutSummary = WorkoutGoal & {
  weeks: { weekStart: string; completed: number }[];
};

export interface WorkoutEvolutionReader {
  getWeeklySummary(studentId: string, date: string): Promise<WeeklyWorkoutSummary>;
}

export interface WorkoutGoalReader {
  getGoal(studentId: string): Promise<WorkoutGoal>;
}

export interface WorkoutGoalWriter {
  saveGoal(studentId: string, goal: WorkoutGoal): Promise<WorkoutGoal>;
}
