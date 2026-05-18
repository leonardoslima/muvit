import { z } from 'zod';

export const muscleGroupSchema = z.enum([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full_body',
]);

export const createExerciseSchema = z.object({
  name: z.string().min(2).max(200),
  muscleGroup: muscleGroupSchema,
  equipment: z.string().max(100).optional(),
  videoUrl: z.string().url().optional(),
  instructions: z.string().max(2000).optional(),
});

export const updateExerciseSchema = createExerciseSchema.partial();

export const exerciseSchema = z.object({
  id: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
  name: z.string(),
  muscleGroup: muscleGroupSchema,
  equipment: z.string().nullable(),
  videoUrl: z.string().nullable(),
  instructions: z.string().nullable(),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v.toISOString() : v)),
});

export const listExercisesQuerySchema = z.object({
  q: z.string().optional(),
  muscleGroup: muscleGroupSchema.optional(),
  scope: z.enum(['mine', 'global', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
