'use server';

import type { CreateWorkoutInput } from '@/application/workouts/workout-editor-model';
import { configureServerClient } from '@/lib/api-client';
import { postWorkoutPlans } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type CreateWorkoutPlanActionResult = {
  success: false;
  error: string;
};

export async function createWorkoutPlanAction(
  input: CreateWorkoutInput,
): Promise<CreateWorkoutPlanActionResult> {
  let response: Awaited<ReturnType<typeof postWorkoutPlans>>;
  try {
    const client = await configureServerClient();
    response = await postWorkoutPlans({ client, body: input });
  } catch {
    return { success: false, error: 'Não foi possível salvar o treino.' };
  }

  if (response.error || !response.data) {
    return { success: false, error: 'Não foi possível salvar o treino.' };
  }
  revalidatePath(`/students/${input.studentId}`);
  revalidatePath('/workouts');
  redirect(`/workouts/${response.data.id}`);
}
