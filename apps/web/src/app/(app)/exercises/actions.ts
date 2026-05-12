'use server';

import { configureServerClient } from '@/lib/api-client';
import { deleteExercisesById, postExercises } from '@/lib/api/sdk.gen';
import type { MuscleGroup } from '@/lib/muscle-groups';
import { revalidatePath } from 'next/cache';

export type CreateExerciseState = { error?: string; fieldErrors?: Record<string, string> } | null;

export async function createExerciseAction(
  _: CreateExerciseState,
  formData: FormData,
): Promise<CreateExerciseState> {
  const name = String(formData.get('name') ?? '').trim();
  const muscleGroup = String(formData.get('muscleGroup') ?? '') as MuscleGroup;
  const equipment = String(formData.get('equipment') ?? '').trim();
  const instructions = String(formData.get('instructions') ?? '').trim();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Informe um nome.';
  if (!muscleGroup) fieldErrors.muscleGroup = 'Selecione um grupo muscular.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const client = await configureServerClient();
  const res = await postExercises({
    client,
    body: {
      name,
      muscleGroup,
      equipment: equipment || undefined,
      instructions: instructions || undefined,
    },
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
