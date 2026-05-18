'use server';

import { configureServerClient } from '@/lib/api-client';
import { postWorkoutPlans } from '@/lib/api/sdk.gen';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type CreateWorkoutInput = {
  studentId: string;
  name: string;
  notes?: string;
  status: 'draft' | 'active' | 'archived';
  days: Array<{
    label: string;
    dayOrder: number;
    exercises: Array<{
      exerciseId: string;
      exerciseOrder: number;
      sets: number;
      reps: string;
      restSeconds?: number;
      loadKg?: number;
      tempo?: string;
      notes?: string;
    }>;
  }>;
};

export async function createWorkoutPlanAction(input: CreateWorkoutInput) {
  const client = await configureServerClient();
  const res = await postWorkoutPlans({ client, body: input });
  if (res.error || !res.data) {
    return { error: 'Não foi possível salvar o treino.' };
  }
  revalidatePath(`/students/${input.studentId}`);
  redirect(`/workouts/${res.data.id}`);
}
