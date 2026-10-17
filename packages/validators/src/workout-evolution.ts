import { z } from 'zod';

const weeklyGoalSchema = z.number().int().min(1).max(7).nullable();

export const workoutEvolutionQuerySchema = z.object({
  date: z.string().date(),
});

export const workoutEvolutionSchema = z.object({
  streakWeeks: z.number().int().min(0),
  completedThisWeek: z.number().int().min(0),
  weeklyGoal: weeklyGoalSchema,
});

export const workoutGoalSchema = z.object({
  weeklyGoal: weeklyGoalSchema,
});

export const updateWorkoutGoalSchema = workoutGoalSchema;

export type WorkoutEvolutionQuery = z.infer<typeof workoutEvolutionQuerySchema>;
export type WorkoutEvolution = z.infer<typeof workoutEvolutionSchema>;
export type WorkoutGoal = z.infer<typeof workoutGoalSchema>;
export type UpdateWorkoutGoal = z.infer<typeof updateWorkoutGoalSchema>;
