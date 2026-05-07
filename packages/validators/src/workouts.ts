import { z } from 'zod';

export const workoutPlanStatusSchema = z.enum(['active', 'archived', 'draft']);

export const workoutExerciseInputSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseOrder: z.number().int().min(0),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(20),
  restSeconds: z.number().int().min(0).max(600).optional(),
  loadKg: z.number().min(0).max(1000).optional(),
  tempo: z.string().max(10).optional(),
  notes: z.string().max(500).optional(),
});

export const workoutDayInputSchema = z.object({
  label: z.string().min(1).max(50),
  dayOrder: z.number().int().min(0),
  exercises: z.array(workoutExerciseInputSchema).min(0),
});

export const createWorkoutPlanSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().min(1).max(200),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  status: workoutPlanStatusSchema.default('draft'),
  notes: z.string().max(2000).optional(),
  days: z.array(workoutDayInputSchema).min(1).max(7),
});

export const updateWorkoutPlanSchema = createWorkoutPlanSchema.omit({ studentId: true }).partial();

const decStrOrNum = z.union([z.string(), z.number()]).nullable();
const dateOrIso = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString() : v));

export const workoutExerciseFullSchema = z.object({
  id: z.string().uuid(),
  workoutDayId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  exerciseOrder: z.number().int(),
  sets: z.number().int(),
  reps: z.string(),
  restSeconds: z.number().int().nullable(),
  loadKg: decStrOrNum,
  tempo: z.string().nullable(),
  notes: z.string().nullable(),
  exercise: z.object({
    id: z.string().uuid(),
    name: z.string(),
    muscleGroup: z.string(),
  }),
});

export const workoutDayFullSchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  label: z.string(),
  dayOrder: z.number().int(),
  exercises: z.array(workoutExerciseFullSchema),
});

export const workoutPlanFullSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
  name: z.string(),
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  status: workoutPlanStatusSchema,
  notes: z.string().nullable(),
  createdAt: dateOrIso,
  days: z.array(workoutDayFullSchema),
});

export const workoutPlanSummarySchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
  name: z.string(),
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  status: workoutPlanStatusSchema,
  createdAt: dateOrIso,
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
