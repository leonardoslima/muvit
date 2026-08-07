'use server';

import { configureServerClient } from '@/lib/api-client';
import { deleteExercisesById, postExercises } from '@/lib/api/sdk.gen';
import { createExerciseSchema } from '@muvit/validators';
import { revalidatePath } from 'next/cache';

export type CreateExerciseState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createExerciseAction(
  _: CreateExerciseState,
  formData: FormData,
): Promise<CreateExerciseState> {
  const name = String(formData.get('name') ?? '').trim();
  const muscleGroup = String(formData.get('muscleGroup') ?? '');
  const equipment = String(formData.get('equipment') ?? '').trim();
  const instructions = String(formData.get('instructions') ?? '').trim();
  const videoUrl = String(formData.get('videoUrl') ?? '').trim();

  const parsed = createExerciseSchema.safeParse({
    name,
    muscleGroup,
    equipment: equipment || undefined,
    instructions: instructions || undefined,
    videoUrl: videoUrl || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
      const message = messages?.[0];
      if (message) fieldErrors[field] = message;
    }
    return { fieldErrors };
  }

  const client = await configureServerClient();
  const res = await postExercises({
    client,
    body: parsed.data,
  });
  if (res.error || !res.data) return { error: 'Não foi possível criar.' };
  revalidatePath('/exercises');
  return null;
}

export async function deleteExerciseAction(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const client = await configureServerClient();
  await deleteExercisesById({ client, path: { id } });
  revalidatePath('/exercises');
}
