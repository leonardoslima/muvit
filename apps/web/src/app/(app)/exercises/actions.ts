'use server';

import {
  type CreateExerciseState,
  buildCreateExerciseSubmission,
} from '@/application/exercises/create-exercise-form';
import { configureServerClient } from '@/lib/api-client';
import { deleteExercisesById, postExercises } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';

export type { CreateExerciseState } from '@/application/exercises/create-exercise-form';

export async function createExerciseAction(
  _: CreateExerciseState,
  formData: FormData,
): Promise<CreateExerciseState> {
  const submission = buildCreateExerciseSubmission(formData);
  if (!submission.ok) return submission.state;

  const client = await configureServerClient();
  const res = await postExercises({
    client,
    body: submission.body,
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
