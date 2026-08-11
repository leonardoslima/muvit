'use server';

import type { CreateWorkoutInput } from '@/application/workouts/workout-editor-model';
import { configureServerClient } from '@/lib/api-client';
import { postWorkoutPlans } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createWorkoutPlanAction(input: CreateWorkoutInput) {
  const client = await configureServerClient();
  const response = await postWorkoutPlans({ client, body: input });
  if (response.error || !response.data) {
    return { error: 'Não foi possível salvar o treino.' };
  }
  revalidatePath(`/students/${input.studentId}`);
  revalidatePath('/workouts');
  redirect(`/workouts/${response.data.id}`);
}
