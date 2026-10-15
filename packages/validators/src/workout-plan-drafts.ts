import { z } from 'zod';
import {
  createWorkoutPlanSchema,
  workoutDayInputSchema,
  workoutExerciseInputSchema,
} from './workouts.js';

const workoutPlanDraftExerciseSchema = workoutExerciseInputSchema.extend({
  reps: z.string().trim().min(1).max(20),
});

const workoutPlanDraftDaySchema = workoutDayInputSchema.extend({
  label: z.string().trim().min(1).max(50),
  exercises: z.array(workoutPlanDraftExerciseSchema).min(1),
});

export const workoutPlanDraftPayloadSchema = createWorkoutPlanSchema
  .omit({ studentId: true, startDate: true, endDate: true, status: true })
  .extend({
    name: z.string().trim().min(1).max(200),
    days: z.array(workoutPlanDraftDaySchema).min(1).max(7),
  });

export const saveWorkoutPlanDraftSchema = z
  .object({
    studentId: z.string().uuid(),
    sourcePlanId: z.string().uuid().optional(),
    draftId: z.string().uuid().optional(),
    payload: workoutPlanDraftPayloadSchema,
    selectedDayOrder: z.number().int().min(0),
    revision: z.number().int().min(1).optional(),
  })
  .refine((input) => input.payload.days.some((day) => day.dayOrder === input.selectedDayOrder), {
    path: ['selectedDayOrder'],
    message: 'O dia selecionado precisa existir no payload.',
  })
  .superRefine((input, context) => {
    if ((input.draftId === undefined) === (input.revision === undefined)) return;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [input.draftId === undefined ? 'draftId' : 'revision'],
      message: 'draftId e revision devem ser informados juntos.',
    });
  });

export const publishWorkoutPlanDraftSchema = z.object({
  payload: workoutPlanDraftPayloadSchema,
  revision: z.number().int().min(1),
});

const dateOrIso = z
  .union([z.string(), z.date()])
  .transform((value) => (value instanceof Date ? value.toISOString() : value));

export const workoutPlanDraftSchema = z
  .object({
    id: z.string().uuid(),
    trainerId: z.string().uuid(),
    studentId: z.string().uuid(),
    sourcePlanId: z.string().uuid().nullable(),
    payload: workoutPlanDraftPayloadSchema,
    selectedDayOrder: z.number().int().min(0),
    revision: z.number().int().min(1),
    createdAt: dateOrIso,
    updatedAt: dateOrIso,
    exerciseReferences: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        muscleGroup: z.string(),
      }),
    ),
  })
  .refine((draft) => draft.payload.days.some((day) => day.dayOrder === draft.selectedDayOrder), {
    path: ['selectedDayOrder'],
    message: 'O dia selecionado precisa existir no payload.',
  });

export type WorkoutPlanDraftPayload = z.infer<typeof workoutPlanDraftPayloadSchema>;
export type SaveWorkoutPlanDraftInput = z.infer<typeof saveWorkoutPlanDraftSchema>;
export type PublishWorkoutPlanDraftInput = z.infer<typeof publishWorkoutPlanDraftSchema>;
export type WorkoutPlanDraft = z.infer<typeof workoutPlanDraftSchema>;
