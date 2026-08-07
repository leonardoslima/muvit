import { createExerciseSchema } from '@muvit/validators';
import type { z } from 'zod';
import { readOptionalTrimmed, readTrimmed } from '../form-data';

export type CreateExerciseState = { error?: string; fieldErrors?: Record<string, string> } | null;

type CreateExerciseSubmission =
  | { ok: true; body: z.infer<typeof createExerciseSchema> }
  | { ok: false; state: CreateExerciseState };

export function buildCreateExerciseSubmission(formData: FormData): CreateExerciseSubmission {
  const parsed = createExerciseSchema.safeParse({
    name: readTrimmed(formData, 'name'),
    muscleGroup: readTrimmed(formData, 'muscleGroup'),
    equipment: readOptionalTrimmed(formData, 'equipment'),
    instructions: readOptionalTrimmed(formData, 'instructions'),
    videoUrl: readOptionalTrimmed(formData, 'videoUrl'),
  });
  if (parsed.success) return { ok: true, body: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    const message = messages?.[0];
    if (message) fieldErrors[field] = message;
  }
  return { ok: false, state: { fieldErrors } };
}
