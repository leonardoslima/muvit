import { z } from 'zod';

export const workoutPlanStatusSchema = z.enum(['active', 'archived', 'draft']);

export const workoutExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseOrder: z.number().int().nonnegative(),
  sets: z.number().int().positive().max(20),
  reps: z.string().max(20),
  restSeconds: z.number().int().nonnegative().optional(),
  loadKg: z.number().nonnegative().optional(),
  tempo: z.string().max(10).optional(),
  notes: z.string().max(500).optional(),
});

export const workoutDayInputSchema = z.object({
  label: z.string().min(1).max(50),
  dayOrder: z.number().int().nonnegative(),
  exercises: z.array(workoutExerciseInputSchema).min(1),
});

export const createWorkoutPlanSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().min(2).max(200),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  status: workoutPlanStatusSchema.default('draft'),
  notes: z.string().max(2000).optional(),
  days: z.array(workoutDayInputSchema).min(1),
});

export const logSetInputSchema = z.object({
  workoutExerciseId: z.string().uuid(),
  setNumber: z.number().int().positive(),
  repsDone: z.number().int().nonnegative().optional(),
  loadKg: z.number().nonnegative().optional(),
  completed: z.boolean().default(false),
});

export const createWorkoutLogSchema = z.object({
  workoutDayId: z.string().uuid(),
  date: z.string().date(),
  durationMin: z.number().int().nonnegative().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(2000).optional(),
  completed: z.boolean().default(false),
  sets: z.array(logSetInputSchema).default([]),
});

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type CreateWorkoutLogInput = z.infer<typeof createWorkoutLogSchema>;
