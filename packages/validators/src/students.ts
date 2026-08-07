import { z } from 'zod';

export const studentGenderSchema = z.enum(['male', 'female', 'other']);
export const studentStatusSchema = z.enum(['active', 'inactive', 'paused']);
const trainingDaysSchema = z.number().int().min(1).max(7);
const internalNotesSchema = z.string().trim().max(2000);

export const createStudentSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  birthDate: z.string().date().optional(),
  gender: studentGenderSchema.optional(),
  goals: z.string().max(1000).optional(),
  trainingDays: trainingDaysSchema.optional(),
  restrictions: z.string().max(1000).optional(),
  internalNotes: internalNotesSchema.optional(),
  status: studentStatusSchema.optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentSchema = z.object({
  id: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
  isIndependent: z.boolean(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  birthDate: z.string().date().nullable(),
  gender: studentGenderSchema.nullable(),
  goals: z.string().nullable(),
  trainingDays: trainingDaysSchema.nullable(),
  restrictions: z.string().nullable(),
  status: studentStatusSchema,
  avatarUrl: z.string().nullable(),
  expoPushToken: z.string().nullable(),
  createdAt: z
    .union([z.string().datetime(), z.date()])
    .transform((v) => (v instanceof Date ? v.toISOString() : v)),
});

export const trainerStudentSchema = studentSchema.extend({
  internalNotes: internalNotesSchema.nullable().optional(),
});

export const listStudentsQuerySchema = z.object({
  q: z.string().optional(),
  status: studentStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
