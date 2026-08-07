import { z } from 'zod';

const dateTimeSchema = z.string().datetime();
const nullableTrimmedString = (maxLength: number) => z.string().trim().max(maxLength).nullable();

export const trainerPlanSchema = z.enum(['free', 'starter', 'pro', 'team']);

const trainerProfileFieldsSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().email().max(255),
  phone: nullableTrimmedString(20),
  bio: nullableTrimmedString(2000),
  specialties: z.array(z.string().trim().min(1).max(50)).max(10),
  avatarUrl: z.string().url().nullable(),
});

export const trainerProfileSchema = trainerProfileFieldsSchema.extend({
  id: z.string().uuid(),
  plan: trainerPlanSchema,
  onboardedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const updateTrainerProfileSchema = trainerProfileFieldsSchema
  .partial()
  .refine((profile) => Object.values(profile).some((value) => value !== undefined), {
    message: 'Informe ao menos um campo para atualizar.',
  });

export type TrainerProfile = z.infer<typeof trainerProfileSchema>;
export type UpdateTrainerProfileInput = z.infer<typeof updateTrainerProfileSchema>;
