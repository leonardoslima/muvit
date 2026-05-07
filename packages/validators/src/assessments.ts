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
  date: z.string().date(),
  weightKg: z.number().positive().max(500).optional(),
  heightCm: z.number().positive().max(300).optional(),
  bodyFatPct: z.number().min(0).max(80).optional(),
  measurements: measurementsSchema.optional(),
  photos: z.array(z.string().url()).max(6).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();

export const assessmentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  date: z.string().date(),
  // Drizzle returns decimals as strings; numbers may also flow in. Accept either.
  weightKg: z.union([z.string(), z.number()]).nullable(),
  heightCm: z.union([z.string(), z.number()]).nullable(),
  bodyFatPct: z.union([z.string(), z.number()]).nullable(),
  measurements: measurementsSchema.nullable(),
  photos: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  createdAt: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v.toISOString() : v)),
});

export const listAssessmentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
