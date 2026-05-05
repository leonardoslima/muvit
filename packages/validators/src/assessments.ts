import { z } from 'zod';

export const measurementsSchema = z
  .object({
    chest: z.number().positive().optional(),
    waist: z.number().positive().optional(),
    hip: z.number().positive().optional(),
    armRight: z.number().positive().optional(),
    armLeft: z.number().positive().optional(),
    thighRight: z.number().positive().optional(),
    thighLeft: z.number().positive().optional(),
    calfRight: z.number().positive().optional(),
    calfLeft: z.number().positive().optional(),
  })
  .strict();

export const createAssessmentSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string().date(),
  weightKg: z.number().positive().max(500).optional(),
  heightCm: z.number().positive().max(300).optional(),
  bodyFatPct: z.number().min(0).max(100).optional(),
  measurements: measurementsSchema.optional(),
  photos: z.array(z.string().url()).max(10).optional(),
  notes: z.string().max(4000).optional(),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;
