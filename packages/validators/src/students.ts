import { z } from 'zod';

export const studentStatusSchema = z.enum(['active', 'inactive', 'paused']);
export const studentGenderSchema = z.enum(['male', 'female', 'other']);

export const createStudentSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  birthDate: z.string().date().optional(),
  gender: studentGenderSchema.optional(),
  goals: z.string().max(2000).optional(),
  restrictions: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: studentStatusSchema.optional(),
});

export const studentSchema = createStudentSchema.extend({
  id: z.string().uuid(),
  trainerId: z.string().uuid().nullable(),
  isIndependent: z.boolean(),
  status: studentStatusSchema,
  createdAt: z.string().datetime(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type Student = z.infer<typeof studentSchema>;
