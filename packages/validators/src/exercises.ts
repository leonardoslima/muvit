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
  instructions: z.string().max(4000).optional(),
});

export const exerciseSchema = createExerciseSchema.extend({
  id: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
